import {
  appendMessage,
  createConversation,
  getLastUserMessage,
  removeLastAssistantMessage,
  replaceLastUserMessage,
  setModel,
  setSystemPrompt,
  toChatMessages
} from "./conversation.js";
import { estimateContextUsage, type ContextEstimate } from "./context-usage.js";
import { DEFAULT_PROVIDER, normalizeBaseUrl } from "../providers/config.js";
import { createInferenceClient, type ClientFactory } from "../providers/factory.js";
import type { InferenceClient, ModelInfo, ProviderId } from "../providers/types.js";
import { ConversationRepository } from "../storage/repository.js";
import {
  PreferencesRepository,
  providerPreference,
  type UserPreferences
} from "../storage/preferences.js";
import { KeychainKeyStore, type KeychainStore } from "../storage/keychain.js";
import type { Conversation, ConversationSummary } from "../storage/schema.js";
import { searchConversations, type SearchMatch } from "../search/search.js";

export class ChatApp {
  private conversation?: Conversation;
  private userPreferences: UserPreferences = { lastProvider: DEFAULT_PROVIDER, providers: {} };
  private readonly clients = new Map<ProviderId, InferenceClient>();

  constructor(
    initialClient?: InferenceClient,
    private readonly repository = new ConversationRepository(),
    private readonly preferences = new PreferencesRepository(),
    private readonly clientFactory: ClientFactory = createInferenceClient,
    private readonly keychain: KeychainStore = new KeychainKeyStore()
  ) {
    if (initialClient) this.clients.set(initialClient.provider, initialClient);
  }

  get currentConversation(): Conversation | undefined {
    return this.conversation;
  }

  get activeProvider(): ProviderId {
    return this.conversation?.provider ?? this.userPreferences.lastProvider ?? DEFAULT_PROVIDER;
  }

  get currentBaseUrl(): string {
    return this.preferenceFor(this.activeProvider).baseUrl;
  }

  getCurrentMessages(): Conversation["messages"] {
    return [...(this.conversation?.messages ?? [])];
  }

  get rememberedModel(): string | undefined {
    return this.preferenceFor(this.activeProvider).lastModel;
  }

  async init(): Promise<void> {
    await this.repository.ensureReady();
    this.userPreferences = await this.preferences.load();
  }

  async configureProvider(provider: ProviderId, baseUrl?: string, makeActive = true): Promise<void> {
    const url = baseUrl ? normalizeBaseUrl(baseUrl) : this.preferenceFor(provider).baseUrl;
    this.setProviderPreference(provider, { baseUrl: url });
    if (makeActive) this.userPreferences.lastProvider = provider;
    this.clients.delete(provider);
    await this.savePreferences();
  }

  setApiKey(provider: ProviderId, key: string): void {
    this.keychain.setApiKey(provider, key.trim());
    this.clients.delete(provider);
  }

  clearApiKey(provider: ProviderId): void {
    this.keychain.clearApiKey(provider);
    this.clients.delete(provider);
  }

  hasApiKey(provider: ProviderId): boolean {
    return Boolean(this.keychain.getApiKey(provider));
  }

  async listModels(provider = this.activeProvider): Promise<ModelInfo[]> {
    return this.clientFor(provider).listModels();
  }

  async ensureProviderRunning(provider = this.activeProvider): Promise<void> {
    await this.clientFor(provider).ensureRunning();
  }

  /** @deprecated Use ensureProviderRunning. */
  async ensureOllamaRunning(): Promise<void> {
    await this.ensureProviderRunning();
  }

  async selectProvider(provider: ProviderId): Promise<string> {
    const models = await this.listModels(provider);
    const preference = this.preferenceFor(provider);
    const model =
      (preference.lastModel && models.some((candidate) => candidate.id === preference.lastModel)
        ? preference.lastModel
        : models[0]?.id);
    if (!model) {
      throw new Error(`No models are available from ${provider}. Load a chat model in the server first.`);
    }

    if (this.conversation) {
      this.conversation.provider = provider;
      setModel(this.conversation, model);
      await this.repository.save(this.conversation);
    }
    this.userPreferences.lastProvider = provider;
    this.setProviderPreference(provider, { lastModel: model });
    await this.savePreferences();
    return model;
  }

  async startDefaultConversation(): Promise<Conversation> {
    return this.startNew();
  }

  async continueLatestConversation(): Promise<Conversation> {
    const [latest] = await this.repository.list();
    if (!latest) throw new Error("No saved conversations found. Start a new chat with `hearth`.");
    return this.loadConversation(latest.id);
  }

  async resumeConversation(reference: string): Promise<Conversation> {
    return this.loadConversation(reference);
  }

  async startNew(model?: string): Promise<Conversation> {
    const provider = this.activeProvider;
    const selectedModel = model ?? (await this.defaultModel(provider));
    await this.clientFor(provider).assertModelAvailable(selectedModel);
    this.conversation = createConversation(selectedModel, undefined, provider);
    await this.repository.save(this.conversation);
    await this.rememberSelection(provider, selectedModel);
    return this.conversation;
  }

  async listConversations(): Promise<ConversationSummary[]> {
    return this.repository.list();
  }

  async loadConversation(reference: string): Promise<Conversation> {
    const loaded = await this.repository.loadByReference(reference);
    await this.clientFor(loaded.provider).ensureRunning();
    this.conversation = loaded;
    await this.rememberSelection(loaded.provider, loaded.model);
    return loaded;
  }

  async saveCurrent(): Promise<void> {
    await this.repository.save(this.requireConversation());
  }

  async switchModel(model: string): Promise<void> {
    const conversation = this.requireConversation();
    await this.clientFor(conversation.provider).assertModelAvailable(model);
    setModel(conversation, model);
    await this.repository.save(conversation);
    await this.rememberSelection(conversation.provider, model);
  }

  async setDefaultModel(model: string): Promise<void> {
    const provider = this.activeProvider;
    await this.clientFor(provider).assertModelAvailable(model);
    await this.rememberSelection(provider, model);
  }

  async setSystem(prompt?: string): Promise<void> {
    const conversation = this.requireConversation();
    setSystemPrompt(conversation, prompt);
    await this.repository.save(conversation);
  }

  async search(query: string): Promise<SearchMatch[]> {
    return searchConversations(await this.repository.readAll(), query);
  }

  async submitUserMessage(content: string, onDelta: (delta: string) => void) {
    const conversation = this.requireConversation();
    appendMessage(conversation, "user", content);
    await this.repository.save(conversation);
    return this.completeAssistantResponse(onDelta);
  }

  async regenerate(onDelta: (delta: string) => void) {
    const conversation = this.requireConversation();
    if (!getLastUserMessage(conversation)) throw new Error("There is no user message to regenerate from.");
    removeLastAssistantMessage(conversation);
    await this.repository.save(conversation);
    return this.completeAssistantResponse(onDelta);
  }

  async editLastUserMessage(content: string, onDelta: (delta: string) => void) {
    const conversation = this.requireConversation();
    replaceLastUserMessage(conversation, content);
    await this.repository.save(conversation);
    return this.completeAssistantResponse(onDelta);
  }

  contextEstimate(): ContextEstimate {
    return estimateContextUsage(this.requireConversation());
  }

  private async completeAssistantResponse(onDelta: (delta: string) => void) {
    const conversation = this.requireConversation();
    let assistantContent = "";
    for await (const event of this.clientFor(conversation.provider).chat(
      conversation.model,
      toChatMessages(conversation)
    )) {
      if (event.type === "delta") {
        assistantContent += event.content;
        onDelta(event.content);
      }
    }
    appendMessage(conversation, "assistant", assistantContent);
    await this.repository.save(conversation);
    return { assistantContent, context: estimateContextUsage(conversation) };
  }

  private clientFor(provider: ProviderId): InferenceClient {
    const baseUrl = this.preferenceFor(provider).baseUrl;
    const existing = this.clients.get(provider);
    if (existing) return existing;
    const client = this.clientFactory(provider, baseUrl, this.keychain.getApiKey(provider));
    this.clients.set(provider, client);
    return client;
  }

  private preferenceFor(provider: ProviderId): { baseUrl: string; lastModel?: string } {
    return providerPreference(this.userPreferences, provider);
  }

  private setProviderPreference(
    provider: ProviderId,
    update: { baseUrl?: string; lastModel?: string }
  ): void {
    this.userPreferences.providers ??= {};
    this.userPreferences.providers[provider] = {
      ...this.userPreferences.providers[provider],
      ...update
    };
  }

  private async defaultModel(provider: ProviderId): Promise<string> {
    const models = await this.listModels(provider);
    const remembered = this.preferenceFor(provider).lastModel;
    if (remembered && models.some((model) => model.id === remembered)) return remembered;
    const first = models[0]?.id;
    if (!first) throw new Error(`No models are available from ${provider}. Load a chat model first.`);
    return first;
  }

  private async rememberSelection(provider: ProviderId, model: string): Promise<void> {
    this.userPreferences.lastProvider = provider;
    this.setProviderPreference(provider, { lastModel: model });
    await this.savePreferences();
  }

  private async savePreferences(): Promise<void> {
    await this.preferences.save(this.userPreferences);
  }

  private requireConversation(): Conversation {
    if (!this.conversation) {
      throw new Error("No active conversation. Use /new [model] or /load <id-or-title> first.");
    }
    return this.conversation;
  }
}

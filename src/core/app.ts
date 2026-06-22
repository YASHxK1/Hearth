import {
  appendMessage,
  createConversation,
  getLastUserMessage,
  removeLastAssistantMessage,
  replaceLastUserMessage,
  setModel,
  setSystemPrompt,
  toOllamaMessages
} from "./conversation.js";
import { estimateContextUsage } from "./context-usage.js";
import type { ContextEstimate } from "./context-usage.js";
import { OllamaClient } from "../ollama/client.js";
import type { OllamaModel } from "../ollama/types.js";
import { ConversationRepository } from "../storage/repository.js";
import { PreferencesRepository } from "../storage/preferences.js";
import type { Conversation, ConversationSummary } from "../storage/schema.js";
import { searchConversations, type SearchMatch } from "../search/search.js";

export class ChatApp {
  private conversation?: Conversation;
  private lastModel?: string;

  constructor(
    private readonly ollama = new OllamaClient(),
    private readonly repository = new ConversationRepository(),
    private readonly preferences = new PreferencesRepository()
  ) {}

  get currentConversation(): Conversation | undefined {
    return this.conversation;
  }

  getCurrentMessages(): Conversation["messages"] {
    return [...(this.conversation?.messages ?? [])];
  }

  get rememberedModel(): string | undefined {
    return this.lastModel;
  }

  async init(): Promise<void> {
    await this.repository.ensureReady();
    const preferences = await this.preferences.load();
    this.lastModel = preferences.lastModel;
  }

  async listModels(): Promise<OllamaModel[]> {
    return this.ollama.listModels();
  }

  async ensureOllamaRunning(): Promise<void> {
    await this.ollama.listModels();
  }

  async startDefaultConversation(): Promise<Conversation> {
    return this.startNew();
  }

  async continueLatestConversation(): Promise<Conversation> {
    const [latest] = await this.repository.list();
    if (!latest) {
      throw new Error("No saved conversations found. Start a new chat with `hearth`.");
    }

    return this.loadConversation(latest.id);
  }

  async resumeConversation(reference: string): Promise<Conversation> {
    return this.loadConversation(reference);
  }

  async startNew(model?: string): Promise<Conversation> {
    const selectedModel = model ?? (await this.defaultModel());
    await this.ollama.assertModelAvailable(selectedModel);
    this.conversation = createConversation(selectedModel);
    await this.repository.save(this.conversation);
    await this.rememberModel(selectedModel);
    return this.conversation;
  }

  async listConversations(): Promise<ConversationSummary[]> {
    return this.repository.list();
  }

  async loadConversation(reference: string): Promise<Conversation> {
    this.conversation = await this.repository.loadByReference(reference);
    await this.rememberModel(this.conversation.model);
    return this.conversation;
  }

  async saveCurrent(): Promise<void> {
    const conversation = this.requireConversation();
    await this.repository.save(conversation);
  }

  async switchModel(model: string): Promise<void> {
    const conversation = this.requireConversation();
    await this.ollama.assertModelAvailable(model);
    setModel(conversation, model);
    await this.repository.save(conversation);
    await this.rememberModel(model);
  }

  async setDefaultModel(model: string): Promise<void> {
    await this.ollama.assertModelAvailable(model);
    await this.rememberModel(model);
  }

  async setSystem(prompt?: string): Promise<void> {
    const conversation = this.requireConversation();
    setSystemPrompt(conversation, prompt);
    await this.repository.save(conversation);
  }

  async search(query: string): Promise<SearchMatch[]> {
    const conversations = await this.repository.readAll();
    return searchConversations(conversations, query);
  }

  async submitUserMessage(
    content: string,
    onDelta: (delta: string) => void
  ): Promise<{ assistantContent: string; context: ContextEstimate }> {
    const conversation = this.requireConversation();
    appendMessage(conversation, "user", content);
    await this.repository.save(conversation);
    return this.completeAssistantResponse(onDelta);
  }

  async regenerate(
    onDelta: (delta: string) => void
  ): Promise<{ assistantContent: string; context: ContextEstimate }> {
    const conversation = this.requireConversation();
    const lastUser = getLastUserMessage(conversation);
    if (!lastUser) {
      throw new Error("There is no user message to regenerate from.");
    }

    removeLastAssistantMessage(conversation);
    await this.repository.save(conversation);
    return this.completeAssistantResponse(onDelta);
  }

  async editLastUserMessage(
    content: string,
    onDelta: (delta: string) => void
  ): Promise<{ assistantContent: string; context: ContextEstimate }> {
    const conversation = this.requireConversation();
    replaceLastUserMessage(conversation, content);
    await this.repository.save(conversation);
    return this.completeAssistantResponse(onDelta);
  }

  contextEstimate(): ContextEstimate {
    return estimateContextUsage(this.requireConversation());
  }

  private async completeAssistantResponse(
    onDelta: (delta: string) => void
  ): Promise<{ assistantContent: string; context: ContextEstimate }> {
    const conversation = this.requireConversation();
    let assistantContent = "";

    for await (const event of this.ollama.chat(conversation.model, toOllamaMessages(conversation))) {
      if (event.type === "delta") {
        assistantContent += event.content;
        onDelta(event.content);
      }
    }

    appendMessage(conversation, "assistant", assistantContent);
    await this.repository.save(conversation);
    return {
      assistantContent,
      context: estimateContextUsage(conversation)
    };
  }

  private requireConversation(): Conversation {
    if (!this.conversation) {
      throw new Error("No active conversation. Use /new [model] or /load <id-or-title> first.");
    }

    return this.conversation;
  }

  private async defaultModel(): Promise<string> {
    const models = await this.ollama.listModels();
    if (this.lastModel && models.some((model) => model.name === this.lastModel || model.model === this.lastModel)) {
      return this.lastModel;
    }

    const first = models[0]?.name ?? models[0]?.model;
    if (!first) {
      throw new Error("No Ollama models are installed. Run `ollama pull <model>` first.");
    }

    return first;
  }

  private async rememberModel(model: string): Promise<void> {
    this.lastModel = model;
    await this.preferences.save({ lastModel: model });
  }
}

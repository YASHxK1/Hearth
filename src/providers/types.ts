export type ProviderId = "ollama" | "lmstudio" | "llamacpp" | "openrouter" | "opencodezen";

export type ModelInfo = {
  id: string;
  name?: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatDelta = {
  type: "delta";
  content: string;
};

export type ChatDone = {
  type: "done";
  raw?: unknown;
};

export type ChatStreamEvent = ChatDelta | ChatDone;

export interface InferenceClient {
  readonly provider: ProviderId;
  readonly baseUrl: string;
  listModels(): Promise<ModelInfo[]>;
  hasModel(name: string): Promise<boolean>;
  assertModelAvailable(name: string): Promise<void>;
  ensureRunning(): Promise<void>;
  chat(model: string, messages: ChatMessage[]): AsyncGenerator<ChatStreamEvent>;
}

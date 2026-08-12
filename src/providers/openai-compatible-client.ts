import { PROVIDER_API_PATHS, PROVIDER_LABELS, requiresApiKey } from "./config.js";
import type {
  ChatMessage,
  ChatStreamEvent,
  InferenceClient,
  ModelInfo,
  ProviderId
} from "./types.js";

type OpenAICompatibleProvider = Extract<
  ProviderId,
  "lmstudio" | "llamacpp" | "openrouter" | "opencodezen"
>;

export class OpenAICompatibleClient implements InferenceClient {
  constructor(
    public readonly provider: OpenAICompatibleProvider,
    public readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly apiKey?: string
  ) {}

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.request(`${this.apiRoot}/models`);
    const body = (await response.json()) as { data?: Array<{ id?: unknown }> };
    if (!Array.isArray(body.data)) {
      throw new Error(`${this.label} returned an invalid model list.`);
    }
    return body.data
      .filter((model): model is { id: string } => typeof model.id === "string" && Boolean(model.id))
      .map((model) => ({ id: model.id, name: model.id }));
  }

  async hasModel(name: string): Promise<boolean> {
    return (await this.listModels()).some((model) => model.id === name);
  }

  async assertModelAvailable(name: string): Promise<void> {
    if (!(await this.hasModel(name))) {
      throw new Error(`Model "${name}" is not available from ${this.label}. Choose a model from /models.`);
    }
  }

  async ensureRunning(): Promise<void> {
    await this.listModels();
  }

  async *chat(model: string, messages: ChatMessage[]): AsyncGenerator<ChatStreamEvent> {
    const response = await this.request(`${this.apiRoot}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true })
    });
    if (!response.body) {
      throw new Error(`${this.label} returned an empty response body.`);
    }
    yield* parseOpenAIStream(response.body, this.label);
  }

  private get label(): string {
    return PROVIDER_LABELS[this.provider];
  }

  private get apiRoot(): string {
    return `${this.baseUrl}${PROVIDER_API_PATHS[this.provider] ?? "/v1"}`;
  }

  private async request(url: string, init?: RequestInit): Promise<Response> {
    const mergedInit: RequestInit | undefined = this.apiKey
      ? {
          ...init,
          headers: {
            ...(init?.headers as Record<string, string> | undefined),
            authorization: `Bearer ${this.apiKey}`
          }
        }
      : init;
    let response: Response;
    try {
      response = await this.fetchImpl(url, mergedInit);
    } catch {
      const hint = requiresApiKey(this.provider)
        ? " Check your network connection and API key."
        : " Start its local server and try again.";
      throw new Error(`Could not reach ${this.label} at ${this.baseUrl}.${hint}`);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const detail = body || response.statusText;
      const hint = this.authHint(detail);
      throw new Error(`${this.label} request failed (${response.status}): ${detail}${hint}`);
    }
    return response;
  }

  private authHint(detail: string): string {
    if (!requiresApiKey(this.provider)) return "";
    if (!this.apiKey) {
      return ` Set an API key with /key ${this.provider} <key>.`;
    }
    if (/401|403|unauthorized|authentication|invalid.*key|insufficient/i.test(detail)) {
      return " Check that your API key is valid.";
    }
    return "";
  }
}

export async function* parseOpenAIStream(
  stream: ReadableStream<Uint8Array>,
  providerLabel = "OpenAI-compatible server"
): AsyncGenerator<ChatStreamEvent> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parseSseLine(line, providerLabel);
      if (event) yield event;
    }
    if (done) break;
  }

  if (buffer.trim()) {
    const event = parseSseLine(buffer, providerLabel);
    if (event) yield event;
  }
}

function parseSseLine(line: string, providerLabel: string): ChatStreamEvent | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(":")) return undefined;
  if (!trimmed.startsWith("data:")) return undefined;
  const data = trimmed.slice(5).trim();
  if (data === "[DONE]") return { type: "done" };

  let chunk: {
    choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
    error?: { message?: string } | string;
  };
  try {
    chunk = JSON.parse(data) as typeof chunk;
  } catch (error) {
    throw new Error(`Could not parse ${providerLabel} stream chunk: ${(error as Error).message}`);
  }
  if (chunk.error) {
    const message = typeof chunk.error === "string" ? chunk.error : chunk.error.message;
    throw new Error(`${providerLabel} stream error: ${message || "Unknown error"}`);
  }
  const choice = chunk.choices?.[0];
  const content = choice?.delta?.content;
  if (typeof content === "string" && content) return { type: "delta", content };
  return undefined;
}

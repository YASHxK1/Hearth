import type {
  ChatStreamEvent,
  OllamaChatChunk,
  OllamaChatMessage,
  OllamaModel
} from "./types.js";

export class OllamaClient {
  constructor(private readonly baseUrl = "http://localhost:11434") {}

  async listModels(): Promise<OllamaModel[]> {
    const response = await this.fetchJson(`${this.baseUrl}/api/tags`);
    const models = (response as { models?: OllamaModel[] }).models;
    return Array.isArray(models) ? models : [];
  }

  async hasModel(name: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some((model) => model.name === name || model.model === name);
  }

  async assertModelAvailable(name: string): Promise<void> {
    if (!(await this.hasModel(name))) {
      throw new Error(
        `Model "${name}" is not installed in Ollama. Run "ollama pull ${name}" or choose a model from /models.`
      );
    }
  }

  async *chat(
    model: string,
    messages: OllamaChatMessage[]
  ): AsyncGenerator<ChatStreamEvent> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true
      })
    }).catch((error: unknown) => {
      throw new Error(`Could not reach Ollama at ${this.baseUrl}: ${(error as Error).message}`);
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama chat failed (${response.status}): ${body || response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Ollama returned an empty response body.");
    }

    yield* parseOllamaStream(response.body);
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url).catch((error: unknown) => {
      throw new Error(`Could not reach Ollama at ${this.baseUrl}: ${(error as Error).message}`);
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama request failed (${response.status}): ${body || response.statusText}`);
    }

    return response.json();
  }
}

export async function* parseOllamaStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<ChatStreamEvent> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      yield parseStreamLine(trimmed);
    }
  }

  buffer += decoder.decode();
  const trimmed = buffer.trim();
  if (trimmed) {
    yield parseStreamLine(trimmed);
  }
}

function parseStreamLine(line: string): ChatStreamEvent {
  let chunk: OllamaChatChunk;
  try {
    chunk = JSON.parse(line) as OllamaChatChunk;
  } catch (error) {
    throw new Error(`Could not parse Ollama stream chunk: ${(error as Error).message}`);
  }

  if (chunk.error) {
    throw new Error(`Ollama stream error: ${chunk.error}`);
  }

  if (chunk.done) {
    return { type: "done", raw: chunk };
  }

  return {
    type: "delta",
    content: chunk.message?.content ?? ""
  };
}

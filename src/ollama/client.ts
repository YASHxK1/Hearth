import { spawn as spawnProcess } from "node:child_process";
import type {
  ChatStreamEvent,
  OllamaChatChunk,
  OllamaChatMessage,
  OllamaModel
} from "./types.js";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_START_TIMEOUT_MS = 10_000;
const OLLAMA_POLL_INTERVAL_MS = 500;
const OLLAMA_TIMEOUT_MESSAGE = "Ollama didn't start in time. Check it's installed and try again.";

type EnsureOllamaOptions = {
  fetchImpl?: typeof fetch;
  spawnImpl?: typeof spawnProcess;
  timeoutMs?: number;
  pollIntervalMs?: number;
};

export async function ensureOllamaRunning(
  baseUrl = DEFAULT_OLLAMA_BASE_URL,
  options: EnsureOllamaOptions = {}
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const spawnImpl = options.spawnImpl ?? spawnProcess;
  const timeoutMs = options.timeoutMs ?? OLLAMA_START_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? OLLAMA_POLL_INTERVAL_MS;

  if (await canReachOllama(baseUrl, fetchImpl)) {
    return;
  }

  try {
    const child = spawnImpl("ollama", ["serve"], {
      detached: true,
      stdio: "ignore"
    });
    child.once?.("error", () => undefined);
    child.unref();
  } catch {
    throw new Error(OLLAMA_TIMEOUT_MESSAGE);
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    if (await canReachOllama(baseUrl, fetchImpl)) {
      return;
    }
  }

  throw new Error(OLLAMA_TIMEOUT_MESSAGE);
}

export class OllamaClient {
  constructor(private readonly baseUrl = DEFAULT_OLLAMA_BASE_URL) {}

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
    await ensureOllamaRunning(this.baseUrl);
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
      throw new Error(`Could not reach Ollama at ${this.baseUrl}. Check it's installed and running.`);
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
    await ensureOllamaRunning(this.baseUrl);
    const response = await fetch(url).catch((error: unknown) => {
      throw new Error(`Could not reach Ollama at ${this.baseUrl}. Check it's installed and running.`);
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama request failed (${response.status}): ${body || response.statusText}`);
    }

    return response.json();
  }
}

async function canReachOllama(baseUrl: string, fetchImpl: typeof fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(`${baseUrl}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

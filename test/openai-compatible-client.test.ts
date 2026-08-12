import { describe, expect, it, vi } from "vitest";
import {
  OpenAICompatibleClient,
  parseOpenAIStream
} from "../src/providers/openai-compatible-client.js";

describe("OpenAICompatibleClient", () => {
  it("lists OpenAI-compatible models", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      object: "list",
      data: [{ id: "local-model" }]
    }))) as unknown as typeof fetch;
    const client = new OpenAICompatibleClient("lmstudio", "http://localhost:1234", fetchImpl);

    await expect(client.listModels()).resolves.toEqual([{ id: "local-model", name: "local-model" }]);
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:1234/v1/models", undefined);
  });

  it("posts chat history and streams text deltas", async () => {
    const body = streamOf(
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":"lo"},"finish_reason":null}]}\n\n' +
      "data: [DONE]\n\n"
    );
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, { status: 200 }));
    const client = new OpenAICompatibleClient(
      "llamacpp",
      "http://localhost:8080",
      fetchMock as unknown as typeof fetch
    );
    const events = [];
    for await (const event of client.chat("model.gguf", [{ role: "user", content: "Hi" }])) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "delta", content: "Hel" },
      { type: "delta", content: "lo" },
      { type: "done" }
    ]);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      model: "model.gguf",
      messages: [{ role: "user", content: "Hi" }],
      stream: true
    });
  });

  it("reports provider-specific connection errors", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("refused"); }) as unknown as typeof fetch;
    const client = new OpenAICompatibleClient("lmstudio", "http://localhost:1234", fetchImpl);
    await expect(client.listModels()).rejects.toThrow("Could not reach LM Studio");
  });
});

describe("OpenAICompatibleClient remote providers", () => {
  it("uses the OpenRouter API path prefix", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      data: [{ id: "openai/gpt-4o" }]
    }))) as unknown as typeof fetch;
    const client = new OpenAICompatibleClient("openrouter", "https://openrouter.ai", fetchImpl, "sk-test");

    await expect(client.listModels()).resolves.toEqual([{ id: "openai/gpt-4o", name: "openai/gpt-4o" }]);
    expect(fetchImpl).toHaveBeenCalledWith("https://openrouter.ai/api/v1/models", {
      headers: { authorization: "Bearer sk-test" }
    });
  });

  it("uses the OpenCode Zen API path prefix and posts chat to chat/completions", async () => {
    const body = streamOf(
      'data: {"choices":[{"delta":{"content":"Zen"}}]}\n\n' +
      "data: [DONE]\n\n"
    );
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(body, { status: 200 })
    );
    const client = new OpenAICompatibleClient(
      "opencodezen",
      "https://opencode.ai",
      fetchMock as unknown as typeof fetch,
      "sk-zen"
    );

    const events = [];
    for await (const event of client.chat("deepseek-v4-flash", [{ role: "user", content: "Hi" }])) {
      events.push(event);
    }

    expect(events).toEqual([{ type: "delta", content: "Zen" }, { type: "done" }]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://opencode.ai/zen/v1/chat/completions");
    expect(init.headers).toEqual({ "content-type": "application/json", authorization: "Bearer sk-zen" });
    expect(JSON.parse(String(init.body))).toEqual({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: "Hi" }],
      stream: true
    });
  });

  it("hints to set an API key when a remote provider returns an auth error", async () => {
    const fetchImpl = vi.fn(async () => new Response("{\"error\":\"unauthorized\"}", {
      status: 401
    })) as unknown as typeof fetch;
    const client = new OpenAICompatibleClient("openrouter", "https://openrouter.ai", fetchImpl);

    await expect(client.listModels()).rejects.toThrow(/401.*Set an API key with \/key openrouter <key>/);
  });
});

describe("parseOpenAIStream", () => {
  it("handles chunks split across byte boundaries", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"sp'));
        controller.enqueue(encoder.encode('lit"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      }
    });
    const events = [];
    for await (const event of parseOpenAIStream(stream)) events.push(event);
    expect(events).toEqual([{ type: "delta", content: "split" }, { type: "done" }]);
  });
});

function streamOf(value: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(value));
      controller.close();
    }
  });
}

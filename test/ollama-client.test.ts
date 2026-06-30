import { describe, expect, it } from "vitest";
import { ensureOllamaRunning, parseOllamaStream } from "../src/ollama/client.js";

describe("parseOllamaStream", () => {
  it("parses newline-delimited Ollama chat chunks", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            '{"message":{"role":"assistant","content":"Hel"}}\n{"message":{"role":"assistant","content":"lo"}}\n{"done":true}\n'
          )
        );
        controller.close();
      }
    });

    const events = [];
    for await (const event of parseOllamaStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "delta", content: "Hel" },
      { type: "delta", content: "lo" },
      { type: "done", raw: { done: true } }
    ]);
  });
});

describe("ensureOllamaRunning", () => {
  it("returns when Ollama is already reachable", async () => {
    await ensureOllamaRunning("http://fake-ollama", {
      fetchImpl: async () => new Response(JSON.stringify({ models: [] }))
    });
  });

  it("throws a clear message when Ollama is unreachable", async () => {
    await expect(
      ensureOllamaRunning("http://fake-ollama", {
        fetchImpl: async () => {
          throw new Error("connection refused");
        }
      })
    ).rejects.toThrow(
      "Ollama is not running. Start it first with `scripts/start-ollama-hidden.ps1` on Windows or `scripts/start-ollama-background.sh` on Linux/macOS."
    );
  });
});

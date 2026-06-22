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
  it("returns without spawning when Ollama is already reachable", async () => {
    let spawnCount = 0;

    await ensureOllamaRunning("http://fake-ollama", {
      fetchImpl: async () => new Response(JSON.stringify({ models: [] })),
      spawnImpl: (() => {
        spawnCount += 1;
        return fakeChildProcess();
      }) as never
    });

    expect(spawnCount).toBe(0);
  });

  it("spawns Ollama and waits until it is reachable", async () => {
    let fetchCount = 0;
    let spawnCount = 0;

    await ensureOllamaRunning("http://fake-ollama", {
      fetchImpl: async () => {
        fetchCount += 1;
        if (fetchCount === 1) {
          throw new Error("connection refused");
        }
        return new Response(JSON.stringify({ models: [] }));
      },
      spawnImpl: ((command: string, args: string[], options: { detached?: boolean; stdio?: string }) => {
        spawnCount += 1;
        expect(command).toBe("ollama");
        expect(args).toEqual(["serve"]);
        expect(options).toMatchObject({ detached: true, stdio: "ignore" });
        return fakeChildProcess();
      }) as never,
      pollIntervalMs: 1,
      timeoutMs: 25
    });

    expect(spawnCount).toBe(1);
    expect(fetchCount).toBeGreaterThanOrEqual(2);
  });

  it("throws a clean timeout message when Ollama does not become reachable", async () => {
    await expect(
      ensureOllamaRunning("http://fake-ollama", {
        fetchImpl: async () => {
          throw new Error("connection refused");
        },
        spawnImpl: (() => fakeChildProcess()) as never,
        pollIntervalMs: 1,
        timeoutMs: 3
      })
    ).rejects.toThrow("Ollama didn't start in time. Check it's installed and try again.");
  });
});

function fakeChildProcess() {
  return {
    once: () => undefined,
    unref: () => undefined
  };
}

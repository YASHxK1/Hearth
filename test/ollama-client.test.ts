import { describe, expect, it } from "vitest";
import { parseOllamaStream } from "../src/ollama/client.js";

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

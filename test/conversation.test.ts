import { describe, expect, it } from "vitest";
import {
  appendMessage,
  createConversation,
  getLastUserMessage,
  removeLastAssistantMessage,
  replaceLastUserMessage,
  setSystemPrompt,
  toOllamaMessages
} from "../src/core/conversation.js";
import { estimateTokens } from "../src/core/context-usage.js";

describe("conversation", () => {
  it("creates conversations and derives a title from the first user message", () => {
    const conversation = createConversation("llama3.2");

    appendMessage(conversation, "user", "Explain TypeScript discriminated unions.");

    expect(conversation.model).toBe("llama3.2");
    expect(conversation.title).toBe("Explain TypeScript discriminated unions.");
    expect(conversation.messages).toHaveLength(1);
  });

  it("prepends the persisted system prompt for Ollama requests", () => {
    const conversation = createConversation("llama3.2");
    setSystemPrompt(conversation, "Be brief.");
    appendMessage(conversation, "user", "Hello");

    expect(toOllamaMessages(conversation)).toEqual([
      { role: "system", content: "Be brief." },
      { role: "user", content: "Hello" }
    ]);
  });

  it("supports regenerate and edit state transitions", () => {
    const conversation = createConversation("llama3.2");
    appendMessage(conversation, "user", "First prompt");
    appendMessage(conversation, "assistant", "First answer");

    expect(removeLastAssistantMessage(conversation)?.content).toBe("First answer");
    expect(getLastUserMessage(conversation)?.content).toBe("First prompt");

    replaceLastUserMessage(conversation, "Updated prompt");

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0]?.content).toBe("Updated prompt");
  });

  it("estimates non-empty text with at least one token", () => {
    expect(estimateTokens("hello")).toBeGreaterThanOrEqual(1);
  });
});

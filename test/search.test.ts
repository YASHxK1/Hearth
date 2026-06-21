import { describe, expect, it } from "vitest";
import { searchConversations } from "../src/search/search.js";
import type { Conversation } from "../src/storage/schema.js";

describe("searchConversations", () => {
  it("finds matching conversations with snippets", () => {
    const conversation: Conversation = {
      id: "conv_1",
      title: "TypeScript notes",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      model: "llama3.2",
      messages: [
        {
          id: "msg_1",
          role: "user",
          content: "How do discriminated unions work?",
          createdAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    };

    const matches = searchConversations([conversation], "union");

    expect(matches).toHaveLength(1);
    expect(matches[0]?.conversation.id).toBe("conv_1");
    expect(matches[0]?.snippets[0]).toContain("union");
  });
});

import type { Conversation } from "../storage/schema.js";

export type ContextEstimate = {
  characters: number;
  approximateTokens: number;
};

export function estimateContextUsage(conversation: Conversation): ContextEstimate {
  const text = [
    conversation.systemPrompt ?? "",
    ...conversation.messages.map((message) => message.content)
  ].join("\n");

  return {
    characters: text.length,
    approximateTokens: estimateTokens(text)
  };
}

export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  const wordish = trimmed.match(/[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
  return Math.max(1, Math.ceil(wordish.length * 1.3));
}

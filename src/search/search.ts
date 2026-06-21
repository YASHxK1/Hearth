import type { Conversation } from "../storage/schema.js";

export type SearchMatch = {
  conversation: Pick<Conversation, "id" | "title" | "updatedAt" | "model">;
  snippets: string[];
};

export function searchConversations(
  conversations: Conversation[],
  query: string,
  maxSnippetsPerConversation = 3
): SearchMatch[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const matches: SearchMatch[] = [];

  for (const conversation of conversations) {
    const snippets: string[] = [];
    const fields = [
      conversation.title,
      conversation.systemPrompt ?? "",
      ...conversation.messages.map((message) => message.content)
    ];

    for (const field of fields) {
      if (field.toLowerCase().includes(normalizedQuery)) {
        snippets.push(createSnippet(field, normalizedQuery));
      }

      if (snippets.length >= maxSnippetsPerConversation) {
        break;
      }
    }

    if (snippets.length > 0) {
      matches.push({
        conversation: {
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updatedAt,
          model: conversation.model
        },
        snippets
      });
    }
  }

  return matches.sort((left, right) =>
    right.conversation.updatedAt.localeCompare(left.conversation.updatedAt)
  );
}

function createSnippet(text: string, query: string): string {
  const normalized = text.toLowerCase();
  const index = normalized.indexOf(query);
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 80);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

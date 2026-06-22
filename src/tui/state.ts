import type { ContextEstimate } from "../core/context-usage.js";
import type { Message } from "../storage/schema.js";
import type { ConversationSummary } from "../storage/schema.js";
import type { OllamaModel } from "../ollama/types.js";
import type { SearchMatch } from "../search/search.js";
import { formatConversationReference } from "../core/conversation-reference.js";

export type DisplayMessage = {
  id: string;
  role: Message["role"] | "notice" | "error";
  content: string;
  isStreaming?: boolean;
};

export type TuiMode = "chat" | "edit-user" | "select-model" | "select-conversation";

export type TuiStatus = {
  activeModel?: string;
  contextEstimate?: ContextEstimate;
  mode: TuiMode;
  isStreaming: boolean;
};

export function fromMessages(messages: Message[]): DisplayMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content
  }));
}

export function notice(content: string): DisplayMessage {
  return {
    id: `notice_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    role: "notice",
    content
  };
}

export function errorMessage(content: string): DisplayMessage {
  return {
    id: `error_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    role: "error",
    content
  };
}

export function formatHelp(): string {
  return [
    "Commands",
    "/help                 Show command help.",
    "/models               Select an installed Ollama model.",
    "/new [model]          Start a new conversation.",
    "/list                 Select a saved conversation.",
    "/load <id-or-title>   Load a saved conversation.",
    "/save                 Save the current conversation.",
    "/model <name>         Switch the current conversation model.",
    "/system [prompt]      Set the system prompt.",
    "/system clear         Clear the system prompt.",
    "/search <query>       Search saved conversations.",
    "/regen                Regenerate the last assistant response.",
    "/edit                 Edit the last user message and resubmit.",
    "/clear                Clear the output view only.",
    "/exit                 Save and exit."
  ].join("\n");
}

export function formatModels(models: OllamaModel[]): string {
  if (models.length === 0) {
    return "No Ollama models installed.";
  }

  return ["Installed models", ...models.map((model) => `- ${model.name ?? model.model}`)].join("\n");
}

export function formatModelPickerRows(models: OllamaModel[]): string[] {
  return models.map((model) => model.name ?? model.model ?? "unknown");
}

export function formatConversationPickerRows(summaries: ConversationSummary[]): string[] {
  return summaries.map(
    (summary) =>
      `${formatConversationReference(summary.id)} ${summary.title}  (${summary.model}, ${summary.messageCount} messages, ${formatDate(
        summary.updatedAt
      )})`
  );
}

export function formatConversationList(summaries: ConversationSummary[]): string {
  if (summaries.length === 0) {
    return "No saved conversations yet.";
  }

  return [
    "Saved conversations",
    ...formatConversationPickerRows(summaries)
  ].join("\n");
}

export function formatSearchMatches(matches: SearchMatch[]): string {
  if (matches.length === 0) {
    return "No matches found.";
  }

  return matches
    .map((match) =>
      [
        `${formatConversationReference(match.conversation.id)} ${match.conversation.title}  (${match.conversation.model}, ${formatDate(
          match.conversation.updatedAt
        )})`,
        ...match.snippets.map((snippet) => `  - ${snippet}`)
      ].join("\n")
    )
    .join("\n\n");
}

export function contextLabel(estimate?: ContextEstimate): string {
  if (!estimate) {
    return "Approx context: 0 tokens";
  }

  return `Approx context: ${estimate.approximateTokens.toLocaleString()} tokens (${estimate.characters.toLocaleString()} chars)`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

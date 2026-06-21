import { createId } from "./ids.js";
import type { Conversation, Message, MessageRole } from "../storage/schema.js";

export function createConversation(model: string, systemPrompt?: string): Conversation {
  const now = new Date().toISOString();
  return {
    id: createId("conv"),
    title: "Untitled conversation",
    createdAt: now,
    updatedAt: now,
    model,
    systemPrompt: normalizeSystemPrompt(systemPrompt),
    messages: []
  };
}

export function appendMessage(
  conversation: Conversation,
  role: MessageRole,
  content: string
): Message {
  const now = new Date().toISOString();
  const message: Message = {
    id: createId("msg"),
    role,
    content,
    createdAt: now
  };

  conversation.messages.push(message);
  conversation.updatedAt = now;

  if (role === "user" && conversation.title === "Untitled conversation") {
    conversation.title = titleFromContent(content);
  }

  return message;
}

export function setModel(conversation: Conversation, model: string): void {
  conversation.model = model;
  touch(conversation);
}

export function setSystemPrompt(conversation: Conversation, prompt?: string): void {
  conversation.systemPrompt = normalizeSystemPrompt(prompt);
  touch(conversation);
}

export function removeLastAssistantMessage(conversation: Conversation): Message | undefined {
  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    if (conversation.messages[index]?.role === "assistant") {
      const [removed] = conversation.messages.splice(index, 1);
      touch(conversation);
      return removed;
    }
  }

  return undefined;
}

export function getLastUserMessage(conversation: Conversation): Message | undefined {
  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const message = conversation.messages[index];
    if (message?.role === "user") {
      return message;
    }
  }

  return undefined;
}

export function replaceLastUserMessage(conversation: Conversation, content: string): Message {
  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const message = conversation.messages[index];
    if (message?.role !== "user") {
      continue;
    }

    const now = new Date().toISOString();
    message.content = content;
    message.createdAt = now;
    conversation.messages.splice(index + 1);
    conversation.updatedAt = now;
    if (index === 0) {
      conversation.title = titleFromContent(content);
    }
    return message;
  }

  throw new Error("No user message is available to edit.");
}

export function toOllamaMessages(conversation: Conversation): Array<{
  role: "system" | "user" | "assistant";
  content: string;
}> {
  const messages = conversation.messages.map(({ role, content }) => ({ role, content }));

  if (conversation.systemPrompt) {
    return [{ role: "system", content: conversation.systemPrompt }, ...messages];
  }

  return messages;
}

function titleFromContent(content: string): string {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Untitled conversation";
  }

  return compact.length > 60 ? `${compact.slice(0, 57)}...` : compact;
}

function normalizeSystemPrompt(prompt?: string): string | undefined {
  const trimmed = prompt?.trim();
  return trimmed ? trimmed : undefined;
}

function touch(conversation: Conversation): void {
  conversation.updatedAt = new Date().toISOString();
}

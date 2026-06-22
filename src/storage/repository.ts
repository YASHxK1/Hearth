import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Conversation, ConversationSummary } from "./schema.js";
import { isConversation } from "./schema.js";
import { getConversationsDir } from "./paths.js";

export class ConversationRepository {
  constructor(private readonly conversationsDir = getConversationsDir()) {}

  async ensureReady(): Promise<void> {
    await mkdir(this.conversationsDir, { recursive: true, mode: 0o700 });
  }

  async save(conversation: Conversation): Promise<void> {
    await this.ensureReady();
    const target = this.pathFor(conversation.id);
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
    const body = `${JSON.stringify(conversation, null, 2)}\n`;
    await writeFile(temp, body, { encoding: "utf8", mode: 0o600 });
    await rename(temp, target);
  }

  async load(id: string): Promise<Conversation> {
    await this.ensureReady();
    const path = this.pathFor(id);
    const raw = await readFile(path, "utf8");
    const parsed = parseConversation(raw, path);
    return parsed;
  }

  async loadByReference(reference: string): Promise<Conversation> {
    const trimmed = reference.trim();
    if (!trimmed) {
      throw new Error("Conversation reference is required.");
    }

    if (await this.exists(trimmed)) {
      return this.load(trimmed);
    }

    const conversations = await this.readAll();

    if (looksLikeConversationId(trimmed)) {
      return matchByIdPrefix(conversations, trimmed);
    }

    const normalized = normalizeTitle(trimmed);
    const exactMatches = conversations.filter(
      (conversation) => normalizeTitle(conversation.title) === normalized
    );

    if (exactMatches.length === 1) {
      return exactMatches[0]!;
    }

    if (exactMatches.length > 1) {
      throw new Error(
        `Multiple conversations are titled "${trimmed}". Use the short ID shown in /list.`
      );
    }

    const partialMatches = conversations.filter((conversation) =>
      normalizeTitle(conversation.title).includes(normalized)
    );

    if (partialMatches.length === 1) {
      return partialMatches[0]!;
    }

    if (partialMatches.length > 1) {
      const titles = partialMatches
        .map((conversation) => `- ${conversation.title} (${conversation.id})`)
        .join("\n");
      throw new Error(`Multiple conversations match "${trimmed}":\n${titles}`);
    }

    throw new Error(`No conversation found with title matching "${trimmed}".`);
  }

  async list(): Promise<ConversationSummary[]> {
    const conversations = await this.readAll();
    return conversations
      .map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        model: conversation.model,
        messageCount: conversation.messages.length
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async readAll(): Promise<Conversation[]> {
    await this.ensureReady();
    const entries = await readdir(this.conversationsDir, { withFileTypes: true });
    const conversations: Conversation[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      const path = join(this.conversationsDir, entry.name);
      const fileStat = await stat(path);
      if (!fileStat.isFile()) {
        continue;
      }

      const raw = await readFile(path, "utf8");
      conversations.push(parseConversation(raw, path));
    }

    return conversations;
  }

  getDirectory(): string {
    return this.conversationsDir;
  }

  private pathFor(id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeId) {
      throw new Error("Conversation ID is invalid.");
    }

    return join(this.conversationsDir, `${safeId}.json`);
  }

  private async exists(id: string): Promise<boolean> {
    try {
      await stat(this.pathFor(id));
      return true;
    } catch {
      return false;
    }
  }
}

function parseConversation(raw: string, path: string): Conversation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse conversation file ${path}: ${(error as Error).message}`);
  }

  if (!isConversation(parsed)) {
    throw new Error(`Conversation file ${path} does not match the expected schema.`);
  }

  return parsed;
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function looksLikeConversationId(value: string): boolean {
  return value.startsWith("conv_");
}

function matchByIdPrefix(conversations: Conversation[], prefix: string): Conversation {
  const matches = conversations.filter((conversation) => conversation.id.startsWith(prefix));

  if (matches.length === 1) {
    return matches[0]!;
  }

  if (matches.length > 1) {
    const choices = matches
      .map((conversation) => `- ${conversation.id} (${conversation.title})`)
      .join("\n");
    throw new Error(`Multiple conversations match "${prefix}". Use a longer ID:\n${choices}`);
  }

  throw new Error(`No conversation found with ID matching "${prefix}".`);
}

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ChatApp } from "../src/core/app.js";
import { appendMessage, createConversation } from "../src/core/conversation.js";
import { OllamaClient } from "../src/ollama/client.js";
import type { ChatStreamEvent, OllamaChatMessage, OllamaModel } from "../src/ollama/types.js";
import { PreferencesRepository } from "../src/storage/preferences.js";
import { ConversationRepository } from "../src/storage/repository.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs.length = 0;
});

describe("ChatApp model preferences", () => {
  it("uses the remembered model for new conversations without explicit model", async () => {
    const { app } = await createTestApp(["llama3.2", "mistral"]);
    await app.setDefaultModel("mistral");

    const conversation = await app.startNew();

    expect(conversation.model).toBe("mistral");
    expect(app.rememberedModel).toBe("mistral");
  });

  it("falls back when the remembered model is not installed", async () => {
    const { app, preferences } = await createTestApp(["llama3.2"]);
    await preferences.save({ lastModel: "missing-model" });
    await app.init();

    const conversation = await app.startNew();

    expect(conversation.model).toBe("llama3.2");
    expect(app.rememberedModel).toBe("llama3.2");
  });

  it("updates remembered model when switching and loading conversations", async () => {
    const { app, repository } = await createTestApp(["llama3.2", "mistral"]);
    const saved = createConversation("mistral");
    appendMessage(saved, "user", "Saved chat");
    await repository.save(saved);

    const conversation = await app.startNew("llama3.2");
    expect(conversation.model).toBe("llama3.2");

    await app.switchModel("mistral");
    expect(app.rememberedModel).toBe("mistral");

    await app.loadConversation(saved.id);
    expect(app.rememberedModel).toBe("mistral");
  });
});

describe("ChatApp startup helpers", () => {
  it("starts a default conversation with the remembered model", async () => {
    const { app } = await createTestApp(["llama3.2", "mistral"]);
    await app.setDefaultModel("mistral");

    const conversation = await app.startDefaultConversation();

    expect(conversation.model).toBe("mistral");
    expect(app.currentConversation?.id).toBe(conversation.id);
  });

  it("continues the most recently updated conversation", async () => {
    const { app, repository } = await createTestApp(["llama3.2", "mistral"]);
    const older = createConversation("llama3.2");
    appendMessage(older, "user", "Older chat");
    older.updatedAt = "2026-01-01T00:00:00.000Z";

    const newer = createConversation("mistral");
    appendMessage(newer, "user", "Newer chat");
    newer.updatedAt = "2026-01-02T00:00:00.000Z";

    await repository.save(older);
    await repository.save(newer);

    const conversation = await app.continueLatestConversation();

    expect(conversation.id).toBe(newer.id);
    expect(app.currentConversation?.id).toBe(newer.id);
    expect(app.rememberedModel).toBe("mistral");
  });

  it("fails clearly when continuing without saved conversations", async () => {
    const { app } = await createTestApp(["llama3.2"]);

    await expect(app.continueLatestConversation()).rejects.toThrow(
      "No saved conversations found. Start a new chat with `hearth`."
    );
  });

  it("resumes a conversation by repository reference", async () => {
    const { app, repository } = await createTestApp(["llama3.2"]);
    const saved = createConversation("llama3.2");
    appendMessage(saved, "user", "Resume by title");
    await repository.save(saved);

    const conversation = await app.resumeConversation("Resume by title");

    expect(conversation.id).toBe(saved.id);
    expect(app.currentConversation?.id).toBe(saved.id);
  });
});

async function createTestApp(models: string[]) {
  const dir = await tempDir();
  const repository = new ConversationRepository(join(dir, "conversations"));
  const preferences = new PreferencesRepository(join(dir, "preferences.json"));
  const app = new ChatApp(new FakeOllamaClient(models), repository, preferences);
  await app.init();
  return { app, repository, preferences };
}

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "hearth-app-test-"));
  dirs.push(dir);
  return dir;
}

class FakeOllamaClient extends OllamaClient {
  constructor(private readonly modelNames: string[]) {
    super("http://fake-ollama");
  }

  override async listModels(): Promise<OllamaModel[]> {
    return this.modelNames.map((name) => ({ name }));
  }

  override async hasModel(name: string): Promise<boolean> {
    return this.modelNames.includes(name);
  }

  override async assertModelAvailable(name: string): Promise<void> {
    if (!this.modelNames.includes(name)) {
      throw new Error(`Model "${name}" is not installed.`);
    }
  }

  override async *chat(
    _model: string,
    _messages: OllamaChatMessage[]
  ): AsyncGenerator<ChatStreamEvent> {
    yield { type: "delta", content: "ok" };
    yield { type: "done", raw: { done: true } };
  }
}

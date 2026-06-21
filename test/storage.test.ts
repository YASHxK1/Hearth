import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { appendMessage, createConversation } from "../src/core/conversation.js";
import { ConversationRepository } from "../src/storage/repository.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs.length = 0;
});

describe("ConversationRepository", () => {
  it("saves, loads, and lists conversations", async () => {
    const dir = await tempDir();
    const repository = new ConversationRepository(dir);
    const conversation = createConversation("llama3.2");
    appendMessage(conversation, "user", "Hello");

    await repository.save(conversation);

    const loaded = await repository.load(conversation.id);
    const list = await repository.list();
    const raw = await readFile(join(dir, `${conversation.id}.json`), "utf8");

    expect(loaded.messages[0]?.content).toBe("Hello");
    expect(list[0]?.id).toBe(conversation.id);
    expect(JSON.parse(raw).id).toBe(conversation.id);
  });

  it("rejects invalid conversation files", async () => {
    const dir = await tempDir();
    const repository = new ConversationRepository(dir);
    await repository.ensureReady();

    await expect(repository.load("missing")).rejects.toThrow();
  });
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "hearth-test-"));
  dirs.push(dir);
  return dir;
}

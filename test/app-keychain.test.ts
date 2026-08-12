import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProviderId } from "../src/providers/types.js";
import type { KeychainStore } from "../src/storage/keychain.js";
import { ChatApp } from "../src/core/app.js";
import { ConversationRepository } from "../src/storage/repository.js";
import { PreferencesRepository } from "../src/storage/preferences.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { InferenceClient } from "../src/providers/types.js";

class FakeKeychain implements KeychainStore {
  private readonly keys = new Map<ProviderId, string>();

  getApiKey(provider: ProviderId): string | undefined {
    return this.keys.get(provider);
  }

  setApiKey(provider: ProviderId, key: string): void {
    this.keys.set(provider, key);
  }

  clearApiKey(provider: ProviderId): void {
    this.keys.delete(provider);
  }
}

const dirs: string[] = [];

describe("ChatApp API key storage", () => {
  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it("stores keys in the keychain and reports their presence", async () => {
    const { app, keychain } = await createApp();

    expect(app.hasApiKey("openrouter")).toBe(false);
    app.setApiKey("openrouter", "sk-test");
    expect(app.hasApiKey("openrouter")).toBe(true);
    expect(keychain.getApiKey("openrouter")).toBe("sk-test");

    app.clearApiKey("openrouter");
    expect(app.hasApiKey("openrouter")).toBe(false);
  });

  it("passes the API key to the inference client factory", async () => {
    const { app, factory } = await createApp();
    app.setApiKey("opencodezen", "sk-zen");

    await app.listModels("opencodezen");

    expect(factory).toHaveBeenCalledWith("opencodezen", "https://opencode.ai", "sk-zen");
  });

  it("invalidates cached clients when the key changes", async () => {
    const { app, factory } = await createApp();
    app.setApiKey("openrouter", "first-key");
    await app.listModels("openrouter");
    app.setApiKey("openrouter", "second-key");
    await app.listModels("openrouter");

    const calls = factory.mock.calls.filter(
      (call) => call[0] === "openrouter"
    ) as Array<[string, string, string]>;
    expect(calls.map((call) => call[2])).toEqual(["first-key", "second-key"]);
  });
});

async function createApp(): Promise<{
  app: ChatApp;
  keychain: FakeKeychain;
  factory: ReturnType<typeof createFakeFactory>;
}> {
  const dir = await mkdtemp(join(tmpdir(), "hearth-key-test-"));
  dirs.push(dir);
  const keychain = new FakeKeychain();
  const factory = createFakeFactory();
  const app = new ChatApp(
    undefined,
    new ConversationRepository(join(dir, "conversations")),
    new PreferencesRepository(join(dir, "preferences.json")),
    factory,
    keychain
  );
  await app.init();
  return { app, keychain, factory };
}

function createFakeFactory() {
  const factory = vi.fn(
    (provider: ProviderId, baseUrl: string, _apiKey?: string): InferenceClient => {
      return new FakeClient(provider, baseUrl);
    }
  );
  return factory;
}

class FakeClient implements InferenceClient {
  constructor(
    readonly provider: ProviderId,
    readonly baseUrl: string
  ) {}

  async listModels() {
    return [{ id: "model-1" }];
  }

  async hasModel(name: string): Promise<boolean> {
    return name === "model-1";
  }

  async assertModelAvailable(name: string): Promise<void> {
    if (!(await this.hasModel(name))) throw new Error("Missing model");
  }

  async ensureRunning(): Promise<void> {}

  async *chat(): AsyncGenerator<never> {
    yield* [];
  }
}

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PreferencesRepository } from "../src/storage/preferences.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs.length = 0;
});

describe("PreferencesRepository", () => {
  it("returns empty defaults when preferences do not exist", async () => {
    const repository = new PreferencesRepository(join(await tempDir(), "preferences.json"));

    await expect(repository.load()).resolves.toEqual({});
  });

  it("saves and reloads the last model", async () => {
    const path = join(await tempDir(), "preferences.json");
    const repository = new PreferencesRepository(path);

    await repository.save({ lastModel: "llama3.2" });

    await expect(repository.load()).resolves.toEqual({ lastModel: "llama3.2" });
    await expect(readFile(path, "utf8")).resolves.toContain("llama3.2");
  });

  it("ignores corrupt preferences files", async () => {
    const dir = await tempDir();
    const path = join(dir, "preferences.json");
    await mkdir(dir, { recursive: true });
    await writeFile(path, "{ nope", "utf8");

    await expect(new PreferencesRepository(path).load()).resolves.toEqual({});
  });
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "hearth-prefs-test-"));
  dirs.push(dir);
  return dir;
}

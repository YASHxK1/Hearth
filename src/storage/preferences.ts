import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getPreferencesPath } from "./paths.js";

export type UserPreferences = {
  lastModel?: string;
};

export class PreferencesRepository {
  constructor(private readonly preferencesPath = getPreferencesPath()) {}

  async load(): Promise<UserPreferences> {
    try {
      const raw = await readFile(this.preferencesPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        lastModel: normalizeString(parsed.lastModel)
      };
    } catch {
      return {};
    }
  }

  async save(preferences: UserPreferences): Promise<void> {
    await mkdir(dirname(this.preferencesPath), { recursive: true, mode: 0o700 });
    const temp = `${this.preferencesPath}.${process.pid}.${Date.now()}.tmp`;
    const body = `${JSON.stringify(cleanPreferences(preferences), null, 2)}\n`;
    await writeFile(temp, body, { encoding: "utf8", mode: 0o600 });
    await rename(temp, this.preferencesPath);
  }
}

function cleanPreferences(preferences: UserPreferences): UserPreferences {
  return {
    lastModel: normalizeString(preferences.lastModel)
  };
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getPreferencesPath } from "./paths.js";
import { DEFAULT_BASE_URLS, DEFAULT_PROVIDER, PROVIDER_IDS } from "../providers/config.js";
import type { ProviderId } from "../providers/types.js";

export type ProviderPreference = {
  baseUrl?: string;
  lastModel?: string;
};

export type UserPreferences = {
  lastProvider?: ProviderId;
  providers?: Partial<Record<ProviderId, ProviderPreference>>;
  /** Legacy v1 preference, read as Ollama's last model. */
  lastModel?: string;
};

export class PreferencesRepository {
  constructor(private readonly preferencesPath = getPreferencesPath()) {}

  async load(): Promise<UserPreferences> {
    try {
      const raw = await readFile(this.preferencesPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return normalizePreferences(parsed);
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
  const normalized = normalizePreferences(preferences);
  return {
    lastProvider: normalized.lastProvider,
    providers: normalized.providers
  };
}

function normalizePreferences(preferences: Partial<UserPreferences>): UserPreferences {
  const providers: Partial<Record<ProviderId, ProviderPreference>> = {};
  for (const provider of PROVIDER_IDS) {
    const input = preferences.providers?.[provider];
    const baseUrl = normalizeString(input?.baseUrl);
    const lastModel = normalizeString(input?.lastModel);
    if (baseUrl || lastModel) providers[provider] = { baseUrl, lastModel };
  }
  const legacyModel = normalizeString(preferences.lastModel);
  if (legacyModel && !providers.ollama?.lastModel) {
    providers.ollama = { ...providers.ollama, lastModel: legacyModel };
  }
  const lastProvider = isProviderId(preferences.lastProvider)
    ? preferences.lastProvider
    : DEFAULT_PROVIDER;
  return { lastProvider, providers };
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as string[]).includes(value);
}

export function providerPreference(
  preferences: UserPreferences,
  provider: ProviderId
): Required<Pick<ProviderPreference, "baseUrl">> & Pick<ProviderPreference, "lastModel"> {
  return {
    baseUrl: preferences.providers?.[provider]?.baseUrl ?? DEFAULT_BASE_URLS[provider],
    lastModel: preferences.providers?.[provider]?.lastModel
  };
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

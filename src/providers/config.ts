import type { ProviderId } from "./types.js";

export const PROVIDER_IDS: ProviderId[] = [
  "ollama",
  "lmstudio",
  "llamacpp",
  "openrouter",
  "opencodezen"
];

export const DEFAULT_PROVIDER: ProviderId = "ollama";

export const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  ollama: "http://localhost:11434",
  lmstudio: "http://localhost:1234",
  llamacpp: "http://localhost:8080",
  openrouter: "https://openrouter.ai",
  opencodezen: "https://opencode.ai"
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
  llamacpp: "llama.cpp",
  openrouter: "OpenRouter",
  opencodezen: "OpenCode Zen"
};

export const PROVIDER_API_PATHS: Partial<Record<ProviderId, string>> = {
  lmstudio: "/v1",
  llamacpp: "/v1",
  openrouter: "/api/v1",
  opencodezen: "/zen/v1"
};

export function requiresApiKey(provider: ProviderId): boolean {
  return provider === "openrouter" || provider === "opencodezen";
}

export function parseProviderId(value: string): ProviderId {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "ollama" ||
    normalized === "lmstudio" ||
    normalized === "llamacpp" ||
    normalized === "openrouter" ||
    normalized === "opencodezen"
  ) {
    return normalized;
  }
  if (normalized === "lm-studio" || normalized === "lm studio") {
    return "lmstudio";
  }
  if (normalized === "llama.cpp" || normalized === "llama-cpp" || normalized === "llama cpp") {
    return "llamacpp";
  }
  if (
    normalized === "open-router" ||
    normalized === "open router" ||
    normalized === "openrouter.ai"
  ) {
    return "openrouter";
  }
  if (
    normalized === "zen" ||
    normalized === "opencode-zen" ||
    normalized === "opencode zen" ||
    normalized === "open-code-zen" ||
    normalized === "open-code" ||
    normalized === "open code" ||
    normalized === "opencode" ||
    normalized === "opencode.ai"
  ) {
    return "opencodezen";
  }
  throw new Error(`Unknown provider "${value}". Choose one of: ${PROVIDER_IDS.join(", ")}.`);
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Invalid server URL "${value}". Use an absolute http:// or https:// URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Invalid server URL "${value}". Use an absolute http:// or https:// URL.`);
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Server URLs must be an origin without credentials, paths, query parameters, or fragments.");
  }
  return url.toString().replace(/\/$/, "");
}

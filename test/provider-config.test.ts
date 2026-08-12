import { describe, expect, it } from "vitest";
import {
  normalizeBaseUrl,
  parseProviderId,
  PROVIDER_API_PATHS,
  requiresApiKey
} from "../src/providers/config.js";

describe("provider configuration", () => {
  it("accepts canonical and friendly provider names", () => {
    expect(parseProviderId("lmstudio")).toBe("lmstudio");
    expect(parseProviderId("llama.cpp")).toBe("llamacpp");
    expect(parseProviderId("openrouter")).toBe("openrouter");
    expect(parseProviderId("open router")).toBe("openrouter");
    expect(parseProviderId("opencodezen")).toBe("opencodezen");
    expect(parseProviderId("zen")).toBe("opencodezen");
    expect(parseProviderId("opencode-zen")).toBe("opencodezen");
    expect(parseProviderId("open code")).toBe("opencodezen");
  });

  it("maps remote providers to their API path prefixes", () => {
    expect(PROVIDER_API_PATHS.lmstudio).toBe("/v1");
    expect(PROVIDER_API_PATHS.llamacpp).toBe("/v1");
    expect(PROVIDER_API_PATHS.openrouter).toBe("/api/v1");
    expect(PROVIDER_API_PATHS.opencodezen).toBe("/zen/v1");
  });

  it("requires API keys for remote providers only", () => {
    expect(requiresApiKey("ollama")).toBe(false);
    expect(requiresApiKey("lmstudio")).toBe(false);
    expect(requiresApiKey("llamacpp")).toBe(false);
    expect(requiresApiKey("openrouter")).toBe(true);
    expect(requiresApiKey("opencodezen")).toBe(true);
  });

  it("normalizes absolute HTTP server URLs", () => {
    expect(normalizeBaseUrl("http://localhost:1234/")).toBe("http://localhost:1234");
    expect(() => normalizeBaseUrl("localhost:1234")).toThrow("absolute http:// or https://");
    expect(() => normalizeBaseUrl("http://localhost:1234/v1")).toThrow("must be an origin");
  });
});

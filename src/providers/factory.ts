import { OllamaClient } from "../ollama/client.js";
import { OpenAICompatibleClient } from "./openai-compatible-client.js";
import type { InferenceClient, ProviderId } from "./types.js";

export type ClientFactory = (
  provider: ProviderId,
  baseUrl: string,
  apiKey?: string
) => InferenceClient;

export const createInferenceClient: ClientFactory = (provider, baseUrl, apiKey) => {
  if (provider === "ollama") return new OllamaClient(baseUrl);
  return new OpenAICompatibleClient(provider, baseUrl, fetch, apiKey);
};

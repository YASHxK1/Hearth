export type OllamaModel = {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
};

export type { ChatMessage as OllamaChatMessage } from "../providers/types.js";

export type OllamaChatChunk = {
  model?: string;
  created_at?: string;
  message?: {
    role?: "assistant";
    content?: string;
  };
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  error?: string;
};

export type { ChatDelta, ChatDone, ChatStreamEvent } from "../providers/types.js";

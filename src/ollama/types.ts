export type OllamaModel = {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
};

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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

export type ChatDelta = {
  type: "delta";
  content: string;
};

export type ChatDone = {
  type: "done";
  raw: OllamaChatChunk;
};

export type ChatStreamEvent = ChatDelta | ChatDone;

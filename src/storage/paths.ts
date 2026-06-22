import { homedir } from "node:os";
import { join } from "node:path";

export function getDataDir(): string {
  return process.env.OLLAMA_TERMINAL_CHAT_HOME ?? join(homedir(), ".ollama-cli-chat");
}

export function getConversationsDir(dataDir = getDataDir()): string {
  return join(dataDir, "conversations");
}

export function getPreferencesPath(dataDir = getDataDir()): string {
  return join(dataDir, "preferences.json");
}

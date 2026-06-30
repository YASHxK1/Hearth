import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("script-based Ollama startup", () => {
  it("does not launch Ollama from the TypeScript client", () => {
    const clientSource = readFileSync(new URL("../src/ollama/client.ts", import.meta.url), "utf8");

    expect(clientSource).not.toContain("node:child_process");
    expect(clientSource).not.toContain("spawn");
    expect(clientSource).not.toContain("ollama\", [\"serve\"]");
  });

  it("includes a hidden Windows startup script", () => {
    const script = readFileSync(new URL("../scripts/start-ollama-hidden.ps1", import.meta.url), "utf8");

    expect(script).toContain("Start-Process -WindowStyle Hidden");
    expect(script).toContain("ollama");
    expect(script).toContain("serve");
    expect(script).toContain("http://localhost:11434/api/tags");
  });

  it("includes a Unix background startup script with Hearth log output", () => {
    const script = readFileSync(new URL("../scripts/start-ollama-background.sh", import.meta.url), "utf8");

    expect(script).toContain("nohup ollama serve");
    expect(script).toContain("$HOME/.hearth/logs/ollama.log");
    expect(script).toContain("http://localhost:11434/api/tags");
  });
});

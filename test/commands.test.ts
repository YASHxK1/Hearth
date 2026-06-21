import { describe, expect, it } from "vitest";
import { parseCommand } from "../src/cli/commands.js";

describe("parseCommand", () => {
  it("returns undefined for normal chat input", () => {
    expect(parseCommand("hello there")).toBeUndefined();
  });

  it("parses a command without args", () => {
    expect(parseCommand("/help")).toEqual({ name: "help", args: "" });
  });

  it("parses a command with args", () => {
    expect(parseCommand("/model llama3.2:latest")).toEqual({
      name: "model",
      args: "llama3.2:latest"
    });
  });
});

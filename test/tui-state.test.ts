import { describe, expect, it } from "vitest";
import {
  contextLabel,
  formatConversationList,
  formatHelp,
  formatModels,
  formatSearchMatches
} from "../src/tui/state.js";

describe("tui formatters", () => {
  it("formats help text with the expected commands", () => {
    expect(formatHelp()).toContain("/new [model]");
    expect(formatHelp()).toContain("/exit");
  });

  it("formats model lists", () => {
    expect(formatModels([{ name: "llama3.2" }])).toContain("llama3.2");
  });

  it("formats empty conversation lists", () => {
    expect(formatConversationList([])).toBe("No saved conversations yet.");
  });

  it("formats search misses", () => {
    expect(formatSearchMatches([])).toBe("No matches found.");
  });

  it("formats context estimates", () => {
    expect(contextLabel({ approximateTokens: 12, characters: 48 })).toContain("12 tokens");
  });
});

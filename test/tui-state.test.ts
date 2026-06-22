import { describe, expect, it } from "vitest";
import {
  contextLabel,
  formatConversationList,
  formatConversationPickerRows,
  formatHelp,
  formatModelPickerRows,
  formatModels,
  formatSearchMatches
} from "../src/tui/state.js";

describe("tui formatters", () => {
  it("formats help text with the expected commands", () => {
    expect(formatHelp()).toContain("/new [model]");
    expect(formatHelp()).toContain("/load <id-or-title>");
    expect(formatHelp()).toContain("/exit");
  });

  it("formats model lists", () => {
    expect(formatModels([{ name: "llama3.2" }])).toContain("llama3.2");
    expect(formatModelPickerRows([{ name: "llama3.2" }])).toEqual(["llama3.2"]);
  });

  it("formats empty conversation lists", () => {
    expect(formatConversationList([])).toBe("No saved conversations yet.");
  });

  it("formats conversation lists with shortened IDs", () => {
    expect(
      formatConversationList([
        {
          id: "conv_6794fa16-a111-4000-9000-000000000001",
          title: "Prefix loading",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          model: "llama3.2",
          messageCount: 2
        }
      ])
    ).toContain("conv_6794fa16- Prefix loading");
  });

  it("formats conversation picker rows with shortened IDs", () => {
    expect(
      formatConversationPickerRows([
        {
          id: "conv_6794fa16-a111-4000-9000-000000000001",
          title: "Picker row",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          model: "llama3.2",
          messageCount: 2
        }
      ])[0]
    ).toContain("conv_6794fa16- Picker row");
  });

  it("formats search misses", () => {
    expect(formatSearchMatches([])).toBe("No matches found.");
  });

  it("formats context estimates", () => {
    expect(contextLabel({ approximateTokens: 12, characters: 48 })).toContain("12 tokens");
  });
});

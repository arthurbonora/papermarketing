// @vitest-environment node
import { describe, expect, it } from "vitest";
import { setupEfforts } from "./agent-setup-fields";

describe("model-specific setup efforts", () => {
  it("offers current Claude efforts without offering them on Haiku", () => {
    expect(setupEfforts("claude_local", "claude-fable-5-1")).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(setupEfforts("claude_local", "claude-sonnet-5-5")).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(setupEfforts("claude_local", "claude-opus-5-5")).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(setupEfforts("claude_local", "claude-haiku-4-5")).toEqual([]);
  });


  it("caps Luna at max while exposing ultra on Sol", () => {
    expect(setupEfforts("codex_local", "gpt-6-luna")).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(setupEfforts("codex_local", "gpt-6-sol")).toContain("ultra");
  });
});

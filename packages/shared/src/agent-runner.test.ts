import { describe, expect, it } from "vitest";
import { agentHarnessType, agentRuntimeSettingsHarness, isRemovedAgentHarness, paperclipRunnerCreationLifecycle, paperclipRunnerProfileForHarness } from "./agent-runner.js";

describe("Cursor Cloud harness identity", () => {
  it("retains its cloud identity across the explicit runner selection", () => {
    expect(paperclipRunnerProfileForHarness("cursor_cloud")).toEqual({ provider: "cursor_cloud" });
    expect(agentHarnessType("paperclip_runner", { provider: "cursor_cloud" })).toBe("cursor_cloud");
    expect(agentRuntimeSettingsHarness("paperclip_runner", { provider: "cursor_cloud" })).toBe("cursor_cloud");
    expect(agentHarnessType("cursor_cloud")).toBe("cursor_cloud");
  });
});

describe("paperclipRunnerCreationLifecycle", () => {
  it("stores no lifecycle for harnesses that follow the product default", () => {
    for (const harness of ["codex_local", "opencode_local", "claude_local"]) {
      expect(paperclipRunnerCreationLifecycle(paperclipRunnerProfileForHarness(harness)!)).toEqual({});
    }
  });

  it("keeps an explicit per_turn for other native harnesses", () => {
    expect(paperclipRunnerCreationLifecycle(paperclipRunnerProfileForHarness("cursor_cloud")!)).toEqual({ lifecycleMode: "per_turn" });
  });
});

describe("removed harnesses", () => {
  it.each(["cursor", "gemini_local", "grok_local", "kimi_local", "pi_local"])(
    "recognizes historical adapter %s without a new Runner profile",
    (adapterType) => {
      expect(isRemovedAgentHarness(adapterType)).toBe(true);
      expect(paperclipRunnerProfileForHarness(adapterType)).toBeUndefined();
    },
  );

  it.each(["antigravity", "copilot", "cursor", "gemini", "grok", "kimi", "pi"])(
    "recognizes the removed ACPX %s profile",
    (acpxAgent) => {
      expect(isRemovedAgentHarness("paperclip_runner", { provider: "acpx", acpxAgent })).toBe(true);
    },
  );

  it.each(["cursor_cloud", "grok_bot", "muse", "openai_dot"])(
    "preserves the external or remote %s provider",
    (provider) => {
      expect(isRemovedAgentHarness("paperclip_runner", { provider })).toBe(false);
    },
  );
});

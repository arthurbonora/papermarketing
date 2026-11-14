import { describe, expect, it } from "vitest";
import { supportsManagedNativeWarmSession, supportsNativeWarmFiles } from "./native-warm-capability.js";
import type { PaperclipRunnerProviderProfile } from "./provider-profile.js";

describe("native warm credential and file admission", () => {
  it("preserves Codex warm support", () => {
    const profile: PaperclipRunnerProviderProfile = { provider: "codex", backend: "codex_app_server", model: "gpt-5.6-sol" };
    expect(supportsNativeWarmFiles(profile)).toBe(true);
    expect(supportsManagedNativeWarmSession(profile, undefined)).toBe(true);
  });
});

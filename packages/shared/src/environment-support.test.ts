import { describe, expect, it } from "vitest";
import {
  adapterSupportsRemoteManagedEnvironments,
  getEnvironmentCapabilities,
  isSandboxProviderSupportedForAdapter,
  supportedEnvironmentDriversForAdapter,
} from "./environment-support.js";

describe("isSandboxProviderSupportedForAdapter", () => {
  it("treats Paperclip Runner as a remote-managed adapter", () => {
    expect(adapterSupportsRemoteManagedEnvironments("paperclip_runner")).toBe(true);
    expect(supportedEnvironmentDriversForAdapter("paperclip_runner")).toEqual([
      "local",
      "ssh",
      "sandbox",
      "plugin",
    ]);
  });

  it("accepts additional sandbox providers for remote-managed adapters", () => {
    expect(
      isSandboxProviderSupportedForAdapter("codex_local", "fake-plugin", ["fake-plugin"]),
    ).toBe(true);
  });

  it("rejects providers for adapters without remote-managed environment support", () => {
    expect(
      isSandboxProviderSupportedForAdapter("openclaw", "fake-plugin", ["fake-plugin"]),
    ).toBe(false);
  });

  it.each(["cursor", "gemini_local", "grok_local", "kimi_local", "pi_local"])(
    "returns no supported environments for removed adapter %s",
    (adapterType) => {
      expect(supportedEnvironmentDriversForAdapter(adapterType)).toEqual([]);
      expect(isSandboxProviderSupportedForAdapter(adapterType, "fake-plugin", ["fake-plugin"])).toBe(false);
    },
  );
});

describe("getEnvironmentCapabilities reusable leases default", () => {
  it("test_absent_reusable_leases_presents_as_false", () => {
    const capabilities = getEnvironmentCapabilities(["codex_local"], {
      sandboxProviders: {
        // The manifest does not declare supportsReusableLeases.
        "fake-plugin": { displayName: "Fake Plugin" },
      },
    });
    expect(capabilities.sandboxProviders["fake-plugin"].supportsReusableLeases).toBe(false);

    // A manifest that declares true still presents as true.
    const declared = getEnvironmentCapabilities(["codex_local"], {
      sandboxProviders: {
        "reuse-plugin": { displayName: "Reuse Plugin", supportsReusableLeases: true },
      },
    });
    expect(declared.sandboxProviders["reuse-plugin"].supportsReusableLeases).toBe(true);

    // The built-in fake provider presents as false.
    expect(capabilities.sandboxProviders.fake.supportsReusableLeases).toBe(false);
  });
});


describe("environment login PTY support", () => {
  it("uses the declared driver of the selected environment", async () => {
    const { environmentSupportsLoginPty } = await import("./environment-support.js");
    const capabilities = { ...getEnvironmentCapabilities(["codex_local"]), loginPtyDrivers: { "fixture:computer": { supportsLoginPty: true } } };
    expect(environmentSupportsLoginPty({ driver: "plugin", config: { pluginKey: "fixture", driverKey: "computer" } }, capabilities)).toBe(true);
    expect(environmentSupportsLoginPty({ driver: "plugin", config: { pluginKey: "other", driverKey: "computer" } }, capabilities)).toBe(false);
    expect(environmentSupportsLoginPty({ driver: "local", config: {} }, capabilities)).toBe(false);
    expect(environmentSupportsLoginPty({ driver: "plugin", config: { pluginKey: "fixture", driverKey: "computer" } }, capabilities, "grok_local")).toBe(false);
    expect(environmentSupportsLoginPty({ driver: "plugin", config: { pluginKey: "fixture", driverKey: "computer" } }, capabilities, "codex_local")).toBe(false);
    expect(environmentSupportsLoginPty({ driver: "plugin", config: { pluginKey: "fixture", driverKey: "computer" } }, { ...capabilities, loginPtyDrivers: { "fixture:computer": { supportsLoginPty: true, supportsCodexLogin: true } } }, "codex_local")).toBe(true);
  });
});

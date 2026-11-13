import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supportsLocalAiLogin } from "../services/local-ai-login-policy.js";
describe("server-host subscription login policy", () => {
  beforeEach(() => {
    vi.stubEnv("PAPERCLIP_ALLOW_ISOLATED_PROVIDER_LOGIN", undefined);
    vi.stubEnv("PAPERCLIP_TRUSTED_MCP_RUNTIME_HOST", undefined);
    vi.stubEnv("PAPERCLIP_TOOL_RUNTIME_TRUSTED_HOST", undefined);
  });
  afterEach(() => vi.unstubAllEnvs());
  it("permits private self-hosted instances and explicit trusted hosts", () => {
    expect(supportsLocalAiLogin({ deploymentMode: "local_trusted", deploymentExposure: "private" })).toBe(true);
    expect(supportsLocalAiLogin({ deploymentMode: "authenticated", deploymentExposure: "private" })).toBe(true);
    expect(supportsLocalAiLogin({ deploymentMode: "authenticated", deploymentExposure: "public", trustedLocalStdioRuntimeHost: "trusted-host" })).toBe(true);
    expect(supportsLocalAiLogin({ deploymentMode: "authenticated", deploymentExposure: "public", trustedLocalStdioRuntimeHost: "" })).toBe(false);
  });
  it.each([undefined, "", "false", "1", "TRUE"])("keeps public login disabled without the exact opt-in: %s", value => {
    vi.stubEnv("PAPERCLIP_ALLOW_ISOLATED_PROVIDER_LOGIN", value);
    expect(supportsLocalAiLogin({ deploymentMode: "authenticated", deploymentExposure: "public" })).toBe(false);
  });
  it("permits isolated provider login without granting trusted MCP runtime authority", () => {
    vi.stubEnv("PAPERCLIP_ALLOW_ISOLATED_PROVIDER_LOGIN", "true");
    expect(supportsLocalAiLogin({ deploymentMode: "authenticated", deploymentExposure: "public", trustedLocalStdioRuntimeHost: "" })).toBe(true);
    expect(process.env.PAPERCLIP_TRUSTED_MCP_RUNTIME_HOST).toBeUndefined();
    expect(process.env.PAPERCLIP_TOOL_RUNTIME_TRUSTED_HOST).toBeUndefined();
  });
});

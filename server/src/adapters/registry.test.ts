import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertValidAdapterLoginCapability } from "@paperclipai/adapter-utils";
import { listServerAdapters, requireServerAdapter } from "./registry.js";
import * as executionTarget from "@paperclipai/adapter-utils/execution-target";
import { BUILTIN_ADAPTER_TYPES } from "./builtin-adapter-types.js";
import { assertHarnessTestPassed } from "../services/agent-harness-verification.js";

const { probeInstallation, verifyApiKey } = vi.hoisted(() => ({
  verifyApiKey: vi.fn(),
  probeInstallation: vi.fn(),
}));
vi.mock("../services/ai-api-key-test.js", () => ({ validateAiApiKey: verifyApiKey }));
vi.mock("../vendor/paperclip-runner/live/index.js", () => ({ probeAcpxClaudeInstallation: probeInstallation }));

// The registry registers a login capability for the two built-in interactive
// adapters. The test checks the scalar values and the presence of the required
// callbacks. It also runs the shared validator, so the built-in capabilities
// obey the same fail-closed contract as an external adapter.

describe("built-in adapter login capabilities", () => {
  it("registers the Codex device-login capability", () => {
    const capability = requireServerAdapter("codex_local").loginCapability;
    expect(capability).toBeDefined();
    if (!capability) return;
    expect(capability.panelMode).toBe("displayed_code");
    expect(capability.timeoutPolicy).toBe("caller_bounded");
    expect(capability.completionClaim).toBeUndefined();
    expect(typeof capability.getCommand).toBe("function");
    expect(typeof capability.parsePrompt).toBe("function");
    expect(() => assertValidAdapterLoginCapability(capability, "codex_local")).not.toThrow();
  });

  it("registers the Grok device-login capability", () => {
    const capability = requireServerAdapter("grok_local").loginCapability;
    expect(capability).toBeDefined();
    if (!capability) return;
    expect(capability.panelMode).toBe("displayed_code");
    expect(capability.timeoutPolicy).toBe("caller_bounded");
    expect(capability.completionClaim).toBeUndefined();
    expect(typeof capability.getCommand).toBe("function");
    expect(typeof capability.parsePrompt).toBe("function");
    expect(() => assertValidAdapterLoginCapability(capability, "grok_local")).not.toThrow();
  });

  it("registers the Claude setup-token capability", () => {
    const capability = requireServerAdapter("claude_local").loginCapability;
    expect(capability).toBeDefined();
    if (!capability) return;
    expect(capability.panelMode).toBe("submitted_browser_code");
    expect(capability.timeoutPolicy).toBe("fixed");
    expect(capability.completionClaim).toBe("storedSessionId");
    expect(typeof capability.getCommand).toBe("function");
    expect(typeof capability.parsePrompt).toBe("function");
    expect(typeof capability.captureCredential).toBe("function");
    expect(() => assertValidAdapterLoginCapability(capability, "claude_local")).not.toThrow();
  });
});

describe("built-in runtime connection tool delivery", () => {
  const expectedStrategies = new Map([
    ["acpx_local", "environment"],
    ["claude_local", "native_mcp"],
    ["codex_local", "native_mcp"],
    ["cursor_cloud", "invocation_context"],
    ["cursor", "environment"],
    ["gemini_local", "environment"],
    ["grok_local", "environment"],
    ["hermes_gateway", "invocation_context"],
    ["hermes_local", "environment"],
    ["kimi_local", "environment"],
    ["openclaw_gateway", "invocation_context"],
    ["opencode_local", "environment"],
    ["paperclip_runner", "environment"],
    ["pi_local", "environment"],
    ["process", "environment"],
    ["http", "invocation_context"],
  ] as const);

  it("requires every built-in adapter to declare its expected delivery strategy", () => {
    const builtIns = listServerAdapters().filter((adapter) => BUILTIN_ADAPTER_TYPES.has(adapter.type));
    expect(new Set(builtIns.map((adapter) => adapter.type))).toEqual(BUILTIN_ADAPTER_TYPES);
    expect(new Map(builtIns.map((adapter) => [adapter.type, adapter.runtimeToolDelivery]))).toEqual(
      expectedStrategies,
    );
  });

  it.each([...expectedStrategies])("delivers %s runtime tools through %s", (type, strategy) => {
    expect(requireServerAdapter(type).runtimeToolDelivery).toBe(strategy);
  });
});


describe("native Cursor Cloud environment checks", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  const context = { companyId: "company-test", adapterType: "paperclip_runner",
    config: { provider: "cursor_cloud", model: "caller-model", repoUrl: "https://github.com/acme/repo", env: { CURSOR_API_KEY: "bound-cloud-key" } } };

  it("checks account access without a prompt and makes unavailable model attestation explicit", async () => {
    vi.stubEnv("PAPERCLIP_PUBLIC_URL", "https://callback.example.test");
    const fetch = vi.fn(async (url: unknown) => String(url).startsWith("https://callback.example.test/") ? new Response(null, { status: 401 }) : new Response(JSON.stringify({ items: [{ id: "caller-model", displayName: "Caller model" }] }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!(context);
    expect(result.status).toBe("warn");
    expect(result.checks.map(check => check.code)).toEqual(["cursor_cloud_account_ready", "cursor_cloud_model_listed", "cursor_cloud_model_identity_unverified"]);
    expect(fetch).toHaveBeenCalledWith("https://api.cursor.com/v1/models", expect.objectContaining({ method: "GET", headers: expect.objectContaining({ Authorization: "Bearer bound-cloud-key" }) }));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toContain("bound-cloud-key");
  });

  it.each([undefined, "http://localhost:3100", "https://callback.example.test/path"])("rejects missing or invalid public callback origin %s before provider reads", async origin => {
    vi.stubEnv("PAPERCLIP_PUBLIC_URL", origin);
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!(context);
    expect(result.status).toBe("fail");
    expect(result.checks[0]?.code).toBe("cursor_cloud_public_relay_unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports an unreachable callback before checking provider credentials", async () => {
    vi.stubEnv("PAPERCLIP_PUBLIC_URL", "https://callback.example.test");
    const fetch = vi.fn(async () => { throw new Error("network unavailable"); }); vi.stubGlobal("fetch", fetch);
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!(context);
    expect(result.checks[0]?.code).toBe("cursor_cloud_public_relay_unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects remote controllers and missing credentials before provider reads", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const remote = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context, executionTarget: { kind: "remote", transport: "ssh", remoteCwd: "/workspace", ssh: {} } as never });
    expect(remote.checks[0]?.code).toBe("cursor_cloud_local_controller_required");
    const missing = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context, config: { ...context.config, env: {} } });
    expect(missing.checks[0]?.code).toBe("cursor_cloud_api_key_missing");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("native ACPX environment checks", () => {
  beforeEach(() => {
    verifyApiKey.mockReset().mockResolvedValue(undefined);
    probeInstallation.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  const context = {
    companyId: "company-test",
    adapterType: "paperclip_runner",
    config: { provider: "acpx", acpxAgent: "claude", model: "claude-sonnet-5" },
  };

  it.each(["pi", "copilot", "kimi", "cursor", "gemini", "grok", "antigravity"])("rejects retired native profile %s before probing", async acpxAgent => {
    const result = await requireServerAdapter("paperclip_runner").testEnvironment({
      ...context, config: { ...context.config, acpxAgent },
    });
    expect(result).toMatchObject({ status: "fail", checks: [{ code: "agent_harness_removed" }] });
    expect(probeInstallation).not.toHaveBeenCalled();
  });

  it("verifies a native Claude key without the global CLI or a model prompt", async () => {
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context,
      config: { ...context.config, env: { ANTHROPIC_API_KEY: "test-key" } },
    });
    expect(result.status).toBe("pass");
    expect(verifyApiKey).toHaveBeenCalledExactlyOnceWith("anthropic", "test-key");
    expect(result.checks.map(check => check.code)).toEqual(["acpx_runtime_ready", "ai_connection_api_key_reverified"]);
  });

  it.each(["verified", "rejected", "unavailable", "missing", "managed"])("keeps remote Grok adoption tied to account verification: %s", async state => {
    if (state === "rejected") verifyApiKey.mockRejectedValue({ details: { code: "ai_connection_api_key_rejected" } });
    if (state === "unavailable") verifyApiKey.mockRejectedValue(new Error("Provider unavailable"));
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context,
      config: { provider: "acpx", acpxAgent: "grok", model: "grok-4.7",
        env: state === "missing" ? {} : { XAI_API_KEY: "fixture-xai-key" },
        ...(state === "managed" ? { managedAiConnection: { method: "api_key" } } : {}) },
      executionTarget: { kind: "remote", transport: "sandbox", remoteCwd: "/workspace", providerKey: "test",
        runner: { execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false, stdout: "Linux\nx86_64\n" }) } },
    });
    if (["missing", "managed"].includes(state)) expect(verifyApiKey).not.toHaveBeenCalled();
    else expect(verifyApiKey).toHaveBeenCalledExactlyOnceWith("xai", "fixture-xai-key");
    expect(result.checks[0]).toMatchObject({ code: "acpx_remote_runtime_unverified", level: "warn" });
    if (state === "verified") expect(() => assertHarnessTestPassed(result)).not.toThrow();
    else expect(() => assertHarnessTestPassed(result)).toThrow("The harness test failed");
    expect(probeGrokInstallation).not.toHaveBeenCalled();
  });

  it.each(["ai_connection_api_key_rejected", "ai_connection_verification_failed"])("fails setup on %s", async code => {
    verifyApiKey.mockRejectedValue({ details: { code } });
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context,
      config: { ...context.config, env: { ANTHROPIC_API_KEY: "test-key" } },
    });
    expect(result.status).toBe("fail");
    expect(result.checks.at(-1)).toMatchObject({ code, level: "error" });
  });

  it.each(["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY"])("preserves the supplementary probe for custom routing via %s", async name => {
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context,
      config: { ...context.config, env: { ANTHROPIC_API_KEY: "test-key", [name]: "configured" } },
    });
    expect(verifyApiKey).not.toHaveBeenCalled();
    expect(result.checks.some(check => check.code === "ai_connection_api_key_reverified")).toBe(false);
  });

  it("reports unsupported local platforms before a successful CLI login can mask them", async () => {
    probeInstallation.mockRejectedValue(new Error("ACPX Claude requires a supported runtime platform"));
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!(context);
    expect(result.status).toBe("fail");
    expect(result.checks).toEqual([expect.objectContaining({
      code: "acpx_runtime_unavailable",
      level: "error",
    })]);
  });

  it.each([
    ["claude", "claude-opus-5-5", "aarch64", "warn"],
    ["claude", "claude-opus-5-5", "arm64", "warn"],
    ["claude", "claude-opus-5-5", "armv7l", "fail"],
  ])("checks the selected remote %s architecture %s without widening other providers", async (agent, model, architecture, status) => {
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context,
      config: { provider: "acpx", acpxAgent: agent, model },
      executionTarget: { kind: "remote", transport: "sandbox", remoteCwd: "/workspace", providerKey: "test",
        runner: { execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false, stdout: `Linux\n${architecture}\n` }) } },
    });
    expect(result.status).toBe(status);
    expect(result.checks[0].code).toBe(status === "warn" ? "acpx_remote_runtime_unverified" : "acpx_runtime_unavailable");
    expect(probeInstallation).not.toHaveBeenCalled();
  });

  it("identifies an incomplete installation and gives the operator a repair", async () => {
    probeInstallation.mockRejectedValue(Object.assign(new Error("The Claude ACP runtime package is missing. Reinstall or rebuild Paperclip."), { code: "ACPX_RUNTIME_PACKAGE_MISSING" }));
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!(context);
    expect(result.status).toBe("fail");
    expect(result.checks[0]).toMatchObject({ code: "acpx_runtime_package_missing", message: expect.stringContaining("Reinstall or rebuild") });
  });

  it("requires a successful installed runtime probe", async () => {
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!(context);
    expect(result.status).toBe("pass");
    expect(probeInstallation).toHaveBeenCalledWith(context.config.model);
  });

  it("does not use the host platform to reject a remote environment", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({
      ...context,
      executionTarget: {
        kind: "remote", transport: "sandbox", remoteCwd: "/workspace", providerKey: "test",
        runner: { execute: vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false, stdout: "Linux\nx86_64\n" }) },
      },
    });
    expect(result.status).toBe("warn");
    expect(result.checks[0].code).toBe("acpx_remote_runtime_unverified");
    expect(probeInstallation).not.toHaveBeenCalled();
  });

  const sshTarget = {
    kind: "remote" as const, transport: "ssh" as const, remoteCwd: "/workspace",
    spec: {
      host: "example.test", port: 22, username: "tester", remoteCwd: "/workspace",
      remoteWorkspacePath: "/workspace", privateKey: null, knownHosts: null, strictHostKeyChecking: true,
    },
  };

  it.each([
    ["Linux\nx86_64\n", "warn"],
    ["Darwin\nx86_64\n", "warn"],
    ["Darwin\narm64\n", "warn"],
    ["Linux\naarch64\n", "warn"],
    ["Linux\narm64\n", "warn"],
    ["Linux\narmv7l\n", "fail"],
    ["", "fail"],
  ])("qualifies the SSH platform from its own uname output %j", async (stdout, status) => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    vi.spyOn(process, "arch", "get").mockReturnValue("x64");
    const probe = vi.spyOn(executionTarget, "runAdapterExecutionTargetShellCommand").mockResolvedValue({
      exitCode: 0, timedOut: false, stdout, stderr: "", signal: null, pid: null, startedAt: new Date(0).toISOString(),
    });
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context, executionTarget: sshTarget });
    expect(result.status).toBe(status);
    expect(probe).toHaveBeenCalledWith(expect.any(String), sshTarget, "uname -s && uname -m", {
      cwd: "/workspace", env: {}, timeoutSec: 15,
    });
  });

  it.each(["timeout", "exit", "exception"])("does not qualify an SSH target after a probe %s", async (failure) => {
    const probe = vi.spyOn(executionTarget, "runAdapterExecutionTargetShellCommand");
    if (failure === "exception") probe.mockRejectedValue(new Error("connection unavailable"));
    else probe.mockResolvedValue({
      exitCode: failure === "exit" ? 1 : 0, timedOut: failure === "timeout",
      stdout: "Linux\nx86_64\n", stderr: "", signal: null, pid: null, startedAt: new Date(0).toISOString(),
    });
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({ ...context, executionTarget: sshTarget });
    expect(result.status).toBe("fail");
    expect(result.checks[0].code).toBe("acpx_runtime_unavailable");
  });
});

describe("plugin Runner-task environment checks", () => {
  it.each([
    { provider: "codex", model: "gpt-6.1-sol" },
    { provider: "acpx", acpxAgent: "claude", model: "claude-opus-5-5" },
  ])("requires a managed AI connection before any task operation: %j", async config => {
    const runnerTask = vi.fn();
    const result = await requireServerAdapter("paperclip_runner").testEnvironment!({ companyId: "company-test", adapterType: "paperclip_runner", config,
      executionTarget: { kind: "remote", transport: "sandbox", remoteCwd: ".", leaseId: "probe-lease",
        runnerTaskProbe: { runId: "probe-run", sessionId: "probe-session" }, runnerTask } as never });
    expect(result).toMatchObject({ adapterType: "paperclip_runner", status: "fail",
      checks: [{ code: "ai_connection_required", level: "error", message: expect.stringContaining("requires a managed AI connection") }] });
    expect(runnerTask).not.toHaveBeenCalled();
    expect(() => assertHarnessTestPassed(result)).toThrow(expect.objectContaining({ code: "ai_connection_required" }));
  });
});

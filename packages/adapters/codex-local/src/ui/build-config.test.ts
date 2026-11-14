import { describe, expect, it } from "vitest";
import { buildCodexLocalConfig, buildPaperclipRunnerConfig } from "./build-config.js";
import type { CreateConfigValues } from "@paperclipai/adapter-utils";

function makeValues(overrides: Partial<CreateConfigValues> = {}): CreateConfigValues {
  return {
    adapterType: "codex_local",
    cwd: "",
    instructionsFilePath: "",
    promptTemplate: "",
    model: "gpt-5.4",
    thinkingEffort: "",
    chrome: false,
    dangerouslySkipPermissions: true,
    search: false,
    fastMode: false,
    dangerouslyBypassSandbox: true,
    command: "",
    args: "",
    extraArgs: "",
    envVars: "",
    envBindings: {},
    url: "",
    bootstrapPrompt: "",
    payloadTemplateJson: "",
    workspaceStrategyType: "project_primary",
    workspaceBaseRef: "",
    workspaceBranchTemplate: "",
    worktreeParentDir: "",
    runtimeServicesJson: "",
    maxTurnsPerRun: 1000,
    heartbeatEnabled: false,
    intervalSec: 300,
    ...overrides,
  };
}

describe("buildCodexLocalConfig", () => {
  it("round-trips native Cursor Cloud fields and credentials without adding local command permission defaults", () => {
    const cloud = { provider: "cursor_cloud", repoUrl: "https://github.com/acme/repo", repoRef: "feature", cloudEnvType: "cloud", autoCreatePR: true };
    const env = { CURSOR_API_KEY: { type: "secret_ref" as const, secretId: "company-key", version: "latest" as const } };
    const first = buildPaperclipRunnerConfig(makeValues({ model: "caller-custom-model", envBindings: env, adapterSchemaValues: cloud }));
    expect(first).toEqual({ ...cloud, model: "caller-custom-model", env, lifecycleMode: "per_turn" });
    const reopened = buildPaperclipRunnerConfig(makeValues({ model: "", envBindings: env, adapterSchemaValues: first }));
    expect(reopened).toEqual(first);
    expect(() => buildPaperclipRunnerConfig(makeValues({ model: "", adapterSchemaValues: cloud }))).toThrow("explicit model");
  });

  it.each(["pi", "copilot", "kimi", "cursor", "gemini", "grok", "antigravity"])(
    "rejects the retired ACPX harness %s before saving",
    (acpxAgent) => {
      const values = makeValues({ model: "explicit-test-model", adapterSchemaValues: { provider: "acpx", acpxAgent } });
      expect(() => buildPaperclipRunnerConfig(values)).toThrow("This agent harness has been removed");
    },
  );

  it("rejects Antigravity even with matching qualification data", () => {
    const model = "exact-antigravity-model";
    const values = makeValues({ model, adapterSchemaValues: { provider: "acpx", acpxAgent: "antigravity" } });
    const context = { candidateHarnesses: [{ agent: "antigravity" as const, model }] };
    expect(() => buildPaperclipRunnerConfig(values, context)).toThrow("This agent harness has been removed");
  });

  it("preserves explicitly disabled hosted search in native Codex configuration", () => {
    expect(buildPaperclipRunnerConfig(makeValues({ search: false }))).toHaveProperty("search", false);
    expect(buildPaperclipRunnerConfig(makeValues({ search: true }))).not.toHaveProperty("search");
  });

  it("omits engine for the auto default so runtime fallback remains available", () => {
    const config = buildCodexLocalConfig(makeValues({ codexEngine: "auto" }));

    expect(config).not.toHaveProperty("engine");
  });

  it("persists explicit engine pins", () => {
    expect(buildCodexLocalConfig(makeValues({ codexEngine: "cli" }))).toMatchObject({ engine: "cli" });
    expect(buildCodexLocalConfig(makeValues({ codexEngine: "acp" }))).toMatchObject({ engine: "acp" });
  });

  it("persists the fastMode toggle into adapter config", () => {
    const config = buildCodexLocalConfig(
      makeValues({
        search: true,
        fastMode: true,
      }),
    );

    expect(config).toMatchObject({
      model: "gpt-5.4",
      search: true,
      fastMode: true,
      dangerouslyBypassApprovalsAndSandbox: true,
    });
  });

  it.each([["gpt-6-astra", "ultra"], ["gpt-6.1-sol", "ultra"], ["gpt-6-sol", "ultra"], ["gpt-6-luna", "max"], ["gpt-5.6-sol", "ultra"], ["gpt-5.6-terra", "ultra"], ["gpt-5.6-luna", "max"]])("persists the exact %s model and supported controls", (model, effort) => {
    const config = buildCodexLocalConfig(
      makeValues({
        model,
        thinkingEffort: effort,
        fastMode: true,
      }),
    );

    expect(config).toMatchObject({
      model,
      modelReasoningEffort: effort,
      fastMode: true,
    });
  });

  it("omits model when the operator leaves it blank", () => {
    const config = buildCodexLocalConfig(makeValues({ model: "" }));

    expect(config).not.toHaveProperty("model");
  });
});

describe("buildPaperclipRunnerConfig", () => {
  it.each(["codex", "claude"])("preserves, overrides and explicitly clears saved %s reasoning effort", harness => {
    const profile = harness === "codex" ? { provider: "codex" } : { provider: "acpx", acpxAgent: "claude" };
    const values = makeValues({ adapterSchemaValues: { ...profile, modelReasoningEffort: "high", reasoningEffort: "low", effort: "low" } });
    const unhydrated = { ...values };
    Reflect.deleteProperty(unhydrated, "thinkingEffort");
    expect(buildPaperclipRunnerConfig(unhydrated).modelReasoningEffort).toBe("high");
    expect(buildPaperclipRunnerConfig({ ...values, thinkingEffort: "max" }).modelReasoningEffort).toBe("max");
    const cleared = buildPaperclipRunnerConfig({ ...values, thinkingEffort: "" });
    for (const key of ["modelReasoningEffort", "reasoningEffort", "effort"]) expect(cleared).not.toHaveProperty(key);
  });
  it.each([undefined, false, true])("preserves Dot attachment consent in create/import forms: %s", value => {
    const config = buildPaperclipRunnerConfig(makeValues({ adapterType: "paperclip_runner", adapterSchemaValues: { provider: "openai_dot", dotAttachmentAccess: value } }));
    expect(config.dotAttachmentAccess).toBe(value === true);
    expect(config.dotWorkspaceAccess).toBe(false);
  });
  it("keeps only settings implemented by the Codex runner profile", () => {
    const config = buildPaperclipRunnerConfig(makeValues({
      codexEngine: "acp",
      codexAcpAgentCommand: "custom-acp",
      codexAcpStateDir: "/tmp/acp",
      search: true,
      fastMode: true,
      dangerouslyBypassSandbox: true,
      instructionsFilePath: "/tmp/AGENTS.md",
      thinkingEffort: "high",
      command: "custom-codex",
      extraArgs: "--unsafe",
    }));

    // No lifecycle choice stores none; the server applies the product default.
    expect(config).not.toHaveProperty("lifecycleMode");
    expect(config).toMatchObject({
      provider: "codex",
      codexPermissionMode: "never",
      model: "gpt-5.4",
      modelReasoningEffort: "high",
      timeoutSec: 0,
      graceSec: 15,
    });
    for (const unsupportedKey of [
      "engine",
      "agentCommand",
      "stateDir",
      "fastMode",
      "dangerouslyBypassApprovalsAndSandbox",
      "command",
      "extraArgs",
    ]) {
      expect(config).not.toHaveProperty(unsupportedKey);
    }
  });

  it("persists bounded Codex permission and warm lifecycle values", () => {
    const config = buildPaperclipRunnerConfig(makeValues({
      adapterType: "paperclip_runner",
      codexPermissionMode: "never",
      paperclipRunnerLifecycleMode: "warm",
      paperclipRunnerIdleTimeoutMs: 45_000,
    }));

    expect(config).toMatchObject({
      provider: "codex",
      codexPermissionMode: "never",
      lifecycleMode: "warm",
      idleTimeoutMs: 45_000,
    });
  });

  it("rejects an unsupported persisted Codex permission instead of coercing it", () => {
    expect(() => buildPaperclipRunnerConfig(makeValues({
      adapterSchemaValues: {
        provider: "unknown",
        codexPermissionMode: "unrestricted",
        lifecycleMode: "forever",
        idleTimeoutMs: -1,
      },
    }))).toThrow("Select Full auto (never ask) before saving");
  });

  it("builds a qualified OpenCode profile from schema-backed values", () => {
    expect(buildPaperclipRunnerConfig(makeValues({
      adapterType: "paperclip_runner",
      model: "",
      adapterSchemaValues: {
        provider: "opencode",
        opencodePermissionMode: "allow",
      },
    }))).toMatchObject({
      provider: "opencode",
      model: "openrouter/deepseek/deepseek-v4-flash-0731",
      opencodePermissionMode: "allow",
      codexPermissionMode: "never",
      acpxPermissionMode: "approve-all",
    });
  });

  it("does not let a stale schema model override the active Codex model", () => {
    expect(buildPaperclipRunnerConfig(makeValues({
      adapterType: "paperclip_runner",
      model: "gpt-5.6-sol",
      adapterSchemaValues: {
        provider: "codex",
        model: "openrouter/stale-model",
        codexPermissionMode: "never",
      },
    }))).toMatchObject({
      provider: "codex",
      model: "gpt-5.6-sol",
      codexPermissionMode: "never",
    });
  });

  it.each(["modelReasoningEffort", "reasoningEffort", "effort"])("keeps explicit Auto Claude effort cleared over saved %s", key => {
    const config = buildPaperclipRunnerConfig(makeValues({ thinkingEffort: "", adapterSchemaValues: { provider: "acpx", acpxAgent: "claude", [key]: "high" } }));
    for (const effortKey of ["modelReasoningEffort", "reasoningEffort", "effort"]) expect(config).not.toHaveProperty(effortKey);
  });
  it.each(["claude-opus-5", "my-custom-model"])("preserves the selected ACPX Claude model %s", (model) => {
    expect(buildPaperclipRunnerConfig(makeValues({ model, adapterSchemaValues: { provider: "acpx" } })))
      .toMatchObject({ provider: "acpx", acpxAgent: "claude", model });
  });

  it("normalizes the removed ACPX Codex configuration to native Codex", () => {
    const config = buildPaperclipRunnerConfig(makeValues({ model: "gpt-5.6-sol", adapterSchemaValues: { provider: "acpx", acpxAgent: "codex" } }));
    expect(config).toMatchObject({ provider: "codex", model: "gpt-5.6-sol" });
    expect(config).not.toHaveProperty("acpxAgent");
  });



  it("builds a Claude Managed profile reference with explicit retention and spend controls", () => {
    const config = buildPaperclipRunnerConfig(makeValues({
      adapterType: "paperclip_runner",
      model: "claude-sonnet-5",
      adapterSchemaValues: {
        provider: "claude_managed",
        managedProfileId: "managed-primary",
        managedAgentsRetentionAcknowledged: true,
        maxSessionListCostUsd: 0.5,
        anthropicAgentId: "editable-resource-id-must-not-survive",
      },
    }));
    expect(config).toMatchObject({
      provider: "claude_managed",
      managedProfileId: "managed-primary",
      model: "claude-sonnet-5",
      managedAgentsRetentionAcknowledged: true,
      maxSessionListCostUsd: 0.5,
    });
    expect(config).not.toHaveProperty("anthropicAgentId");
  });

  it("builds an AgentCore profile reference with bounded invocation controls", () => {
    expect(buildPaperclipRunnerConfig(makeValues({
      adapterType: "paperclip_runner",
      model: "",
      adapterSchemaValues: {
        provider: "aws_agentcore",
        agentCoreProfileId: "agentcore-primary",
        agentCoreRetentionAcknowledged: true,
        maxEstimatedSessionCostUsd: 0.75,
        maxIterations: 8,
        maxOutputTokens: 2_048,
        timeoutSeconds: 45,
      },
    }))).toMatchObject({
      provider: "aws_agentcore",
      agentCoreProfileId: "agentcore-primary",
      model: "global.anthropic.claude-sonnet-4-6",
      agentCoreRetentionAcknowledged: true,
      maxEstimatedSessionCostUsd: 0.75,
      maxIterations: 8,
      maxOutputTokens: 2_048,
      timeoutSeconds: 45,
    });
  });

  it.each([
    ["maxIterations", 0],
    ["maxIterations", 9],
    ["maxIterations", "8"],
    ["maxOutputTokens", 4_097],
    ["timeoutSeconds", 301],
  ])("rejects an unsafe AgentCore %s value", (field, value) => {
    expect(() => buildPaperclipRunnerConfig(makeValues({
      adapterType: "paperclip_runner",
      adapterSchemaValues: {
        provider: "aws_agentcore",
        agentCoreProfileId: "agentcore-primary",
        agentCoreRetentionAcknowledged: true,
        [field]: value,
      },
    }))).toThrow("must be an integer between");
  });

  it("uses the Codex default when no model was selected", () => {
    expect(buildPaperclipRunnerConfig(makeValues({ model: "" }))).toMatchObject({
      provider: "codex",
      model: "gpt-6.1-sol",
    });
  });

  it("bounds warm lifecycle values to the shared safe default", () => {
    expect(buildPaperclipRunnerConfig(makeValues({
      paperclipRunnerLifecycleMode: "warm",
      paperclipRunnerIdleTimeoutMs: 86_400_001,
    }))).toMatchObject({
      lifecycleMode: "warm",
      idleTimeoutMs: 300_000,
    });
  });

  it("omits an idle timeout for turn-by-turn sessions", () => {
    const config = buildPaperclipRunnerConfig(makeValues({
      paperclipRunnerLifecycleMode: "per_turn",
      paperclipRunnerIdleTimeoutMs: 45_000,
    }));

    expect(config).not.toHaveProperty("idleTimeoutMs");
  });
});

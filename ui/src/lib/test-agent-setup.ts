import type { AdapterEnvironmentTestResult } from "@paperclipai/shared";
import { ADAPTER_AUTH_MISSING_CHECK_CODE } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";

/** Readiness alone does not authenticate a provider. Reuse the provider's key
 * verification when present, otherwise retain the existing CLI hello probe. */
export async function testAgentSetup(input: {
  companyId: string;
  agentId?: string;
  adapterType: string;
  runner?: import("@paperclipai/shared").AgentRunnerChoice;
  providerAdapter: string;
  adapterConfig: Record<string, unknown>;
  aiConnection?: import("@paperclipai/shared").AiRuntimeConnectionBinding;
  testCredentials?: Record<string, string>;
  environmentId: string | null;
}): Promise<AdapterEnvironmentTestResult> {
  const payload = {
    ...(input.runner ? { runner: input.runner } : {}),
    ...(input.agentId ? { agentId: input.agentId } : {}),
    ...(input.aiConnection ? { aiConnection: input.aiConnection } : {}),
    adapterConfig: input.adapterConfig,
    ...(input.testCredentials ? { testCredentials: input.testCredentials } : {}),
    environmentId: input.environmentId,
  };
  const runtime = await agentsApi.testEnvironment(
    input.companyId,
    input.adapterType,
    payload,
  );
  if (
    input.aiConnection?.mode === "router" ||
    runtime.checks.some(check => check.code.startsWith("environment_agent_")) ||
    runtime.status === "fail" ||
    runtime.checks.some(
      (check) => check.code === ADAPTER_AUTH_MISSING_CHECK_CODE,
    ) ||
    runtime.checks.some((check) => check.code.includes("hello_probe") || check.code === "ai_connection_api_key_reverified") ||
    !["claude_local", "codex_local"].includes(input.providerAdapter)
  )
    return runtime;
  const provider = await agentsApi.testEnvironment(
    input.companyId,
    input.providerAdapter,
    {
      ...payload,
      runner: "legacy",
      adapterConfig: {
        ...input.adapterConfig,
        engine: "cli",
      },
    },
  );
  const checks = [
    ...new Map(
      [...runtime.checks, ...provider.checks].map((check) => [
        check.code,
        check,
      ]),
    ).values(),
  ];
  return {
    adapterType: runtime.adapterType,
    testedAt: provider.testedAt,
    status:
      provider.status === "fail"
        ? "fail"
        : runtime.status === "warn" || provider.status === "warn"
          ? "warn"
          : "pass",
    checks,
  };
}

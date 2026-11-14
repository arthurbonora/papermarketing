import { DEFAULT_CODEX_LOCAL_MODEL } from "@paperclipai/adapter-codex-local";
import { claudeLocalReasoningEffortsForModel, DEFAULT_CLAUDE_LOCAL_MODEL } from "@paperclipai/adapter-claude-local";
import { codexReasoningEffortOptions } from "./codex-reasoning-effort";
import { PROVIDER_ENV_KEYS } from "./provider-credential";

/** Only controls consumed by each adapter's config builder and runtime belong here. */
export const SETUP_CREDENTIAL_KEYS: Record<string, string> = {
  cursor_cloud: "CURSOR_API_KEY",
  hermes_gateway: "API_SERVER_KEY",
};

export const HERMES_PROVIDER_KEYS: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  zai: "ZAI_API_KEY",
  "kimi-coding": "KIMI_API_KEY",
  minimax: "MINIMAX_API_KEY",
};

export function setupProviderKeys(adapter: string) {
  return adapter === "hermes_local" ? HERMES_PROVIDER_KEYS : PROVIDER_ENV_KEYS;
}

export function setupEfforts(adapter: string, model = ""): string[] {
  switch (adapter) {
    case "claude_local":
      return [...claudeLocalReasoningEffortsForModel(model || DEFAULT_CLAUDE_LOCAL_MODEL)];
    case "codex_local":
      return codexReasoningEffortOptions(model || DEFAULT_CODEX_LOCAL_MODEL)
        .map((option) => option.value)
        .filter(Boolean);
    default:
      return [];
  }
}

export const SETUP_LOGIN_HINTS: Record<string, string> = {
  hermes_local:
    "Use a provider API key, or the existing Hermes provider configuration on the selected environment's host.",
};

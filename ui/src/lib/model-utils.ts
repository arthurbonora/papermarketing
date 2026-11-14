export function extractProviderId(modelId: string): string | null {
  const trimmed = modelId.trim();
  if (!trimmed.includes("/")) return null;
  const provider = trimmed.slice(0, trimmed.indexOf("/")).trim();
  return provider || null;
}

export function extractProviderIdWithFallback(modelId: string, fallback = "other"): string {
  return extractProviderId(modelId) ?? fallback;
}

export function extractModelName(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed.includes("/")) return trimmed;
  return trimmed.slice(trimmed.indexOf("/") + 1).trim();
}

/**
 * Built-in adapters whose model list arrives in a deliberate order: Claude and Codex by family
 * and version, the runner's Codex list, OpenClaw and OpenCode. The model dropdown
 * shows these lists as advertised and sorts all other adapters alphabetically.
 */
const CURATED_MODEL_ORDER_ADAPTERS: ReadonlySet<string> = new Set([
  "claude_local",
  "codex_local",
  "paperclip_runner",
  "openclaw_gateway",
  "opencode_local",
]);

export function adapterCuratesModelOrder(adapterType: string): boolean {
  return CURATED_MODEL_ORDER_ADAPTERS.has(adapterType);
}

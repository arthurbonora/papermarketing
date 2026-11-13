import type { DeploymentMode, DeploymentExposure } from "@paperclipai/shared";

/** Hosted operators may enable only the isolated, owner-scoped login lifecycle.
 * This opt-in does not designate a trusted host for local stdio MCP runtimes. */
export function supportsLocalAiLogin(options: {
  deploymentMode?: DeploymentMode;
  deploymentExposure?: DeploymentExposure;
  trustedLocalStdioRuntimeHost?: string | null;
}) {
  return options.deploymentMode !== "authenticated" || options.deploymentExposure !== "public" ||
    process.env.PAPERCLIP_ALLOW_ISOLATED_PROVIDER_LOGIN === "true" || Boolean(
    options.trustedLocalStdioRuntimeHost ?? process.env.PAPERCLIP_TRUSTED_MCP_RUNTIME_HOST ?? process.env.PAPERCLIP_TOOL_RUNTIME_TRUSTED_HOST,
  );
}

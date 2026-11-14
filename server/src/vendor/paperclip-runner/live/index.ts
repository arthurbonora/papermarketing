/** Source shim; server build replaces it with the runner's compiled live tree. */
type RunnerLiveModule = typeof import("@paperclipai/paperclip-runner/live");
const sourceUrl = new URL(
  "../../../../../packages/paperclip-runner/src/live/index.ts",
  import.meta.url,
);
const runner = (await import(sourceUrl.href)) as RunnerLiveModule;

export const probeAcpxClaudeInstallation = runner.probeAcpxClaudeInstallation;

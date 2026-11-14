import { checks } from "./internal-support.js";
import { privilegedObservation } from "./privileged-support.js";
export function gradeProvisionRuntime(value: unknown) {
  const c = checks(), o = privilegedObservation(value); c.add("actual-release-provision-evidence", !!o, "Actual installed release asset identity and genuine native Pi execution are required."); if (!o) return c.result();
  c.add("owned-release-matched-assets", o.state.assetsInitiallyAbsent === true && o.state.provisionerSucceeded === true
    && typeof o.state.provisionerSha256 === "string" && typeof o.state.nativeClosureSha256 === "string"
    && o.state.releaseVersion === o.state.healthVersion && o.state.assetPathOwned === true,
    "The public operator provisioner installs into the actual source release's owned server package, preserving exact provisioner and closure identities.");
  c.add("qualified-running-pi-agent", o.state.piAgentConfigurationVerified === true && o.state.piRunId != null
    && o.state.piArtifactMatches === true && o.runs.some(run => run.id === o.state.piRunId && run.agentId === o.state.piAgentId
      && run.status === "succeeded" && run.runtimeMode === "native") && o.runs.length === 3,
    "A separately declared Pi worker performs genuine native work with independently read file bytes; download alone never qualifies it.");
  const guidance = String(o.state.guidance ?? "");
  c.add("supported-operator-guidance", /runtime\s+setup\s+pi|runtime.*(?:setup|install)/i.test(guidance) && /operator|terminal|admin/i.test(guidance)
    && !/curl.*latest|I (?:have |successfully )?installed/i.test(guidance), "The actual initial response uses the supported operator path without arbitrary latest binaries or premature success.");
  const phase = o.state.provisionReport as { attributed?: boolean; reply?: string } | undefined;
  c.add("truthful-running-result", phase?.attributed === true && /Pi/i.test(phase.reply ?? "") && /run|execut|qualif/i.test(phase.reply ?? ""),
    "A separate actual native reply interprets the factual provisioning and real worker receipt.");
  return c.result();
}
export const privilegedProvisionCases = [];

import { createHash } from "node:crypto";
import profiles from "../acpx-profiles.json" with { type: "json" };

const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);

/** Release assembly must reject a self-consistent pack built for another release. */
export function verifyReleaseProviderPack(identity, sourceRevision, target = "linux-x64", expected = { profiles }) {
  const { profiles: releaseProfiles } = expected;
  const payload = identity?.payload;
  if (identity?.schema !== "paperclip-runner/remote-provider-pack/v1" || !payload
    || !["linux-x64", "linux-arm64"].includes(target)
    || payload.target?.platform !== "linux" || `linux-${payload.target?.architecture}` !== target
    || payload.runnerSourceRevision !== sourceRevision) throw new Error(`Remote provider pack must match the release source and ${target === "linux-x64" ? "Linux x64" : target} target`);
  if (identity.digest !== `sha256:${createHash("sha256").update(canonical(payload)).digest("hex")}`) {
    throw new Error("Remote provider-pack payload digest mismatch");
  }
  if (payload.pins?.acpx !== releaseProfiles.acpxVersion
    || ["claude", "codex"].some(agent => payload.acpxProfileDigests?.[agent] !== releaseProfiles.profiles[agent].commandDigest)) {
    throw new Error("Remote provider-pack ACPX profiles do not match this release");
  }
  if (Object.keys(payload.providers ?? {}).length || Object.keys(payload.candidateProviders ?? {}).length) {
    throw new Error("Remote provider pack includes unsupported extra providers");
  }
  return identity;
}

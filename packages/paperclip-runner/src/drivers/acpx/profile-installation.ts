import { assertAcpxExecutionAdmission, type AcpxCandidateStartupAdmission } from "./candidate-admission.js";
import type { QualifiedAcpxProfile } from "./qualified-profiles.js";
import { verifyQualifiedAcpxInstallation, type VerifiedAcpxInstallation } from "./installation-integrity.js";

/** Verify the closed set of executable ACPX profiles. */
export async function verifyAcpxProfileInstallation(profile: QualifiedAcpxProfile, candidateAdmission?: AcpxCandidateStartupAdmission): Promise<VerifiedAcpxInstallation> {
  assertAcpxExecutionAdmission(profile, candidateAdmission);
  return verifyQualifiedAcpxInstallation(profile);
}

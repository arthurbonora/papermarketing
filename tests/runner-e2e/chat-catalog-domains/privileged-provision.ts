import { expect } from "@playwright/test";
import { checks } from "./internal-support.js";
import { privilegedDefinition, privilegedObservation } from "./privileged-support.js";

export function gradeProvisionRuntime(value: unknown) {
  const result = checks();
  const observed = privilegedObservation(value);
  const reply = observed?.reply ?? "";
  result.add("retired-runtime-guidance",
    /\bpi\b/i.test(reply) && /removed|retired|no longer (?:supported|available)/i.test(reply),
    "The response identifies Pi as retired in the current release.");
  return result.result();
}

export const privilegedProvisionCases = [privilegedDefinition(
  "instance-operations.provision-runtime", "privileged-provision", {
    async setup() { return {}; },
    grade: gradeProvisionRuntime,
    async verifyResult(ctx) {
      await expect(ctx.input.page.getByTestId("task-chat-composer-input")).toBeVisible();
    },
  },
)];

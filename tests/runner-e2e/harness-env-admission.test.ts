import { expect, it } from "vitest";
import { runnerMatrix } from "./catalog.js";
import { buildRunnerE2EProcessEnvironment, buildPaperclipServerEnvironment } from "./harness-env.js";

it("strips ambient candidate startup records from supported harness environments", () => {
  const codex = runnerMatrix.find(row => row.profile.id === "runner-codex")!;
  const ambient = { PAPERCLIP_ACPX_CANDIDATE_ADMISSION: "forged", PAPERCLIP_RUNNER_ACPX_QUALIFICATION: "forged" };
  const env = buildRunnerE2EProcessEnvironment(ambient, [codex]);
  expect(env.PAPERCLIP_ACPX_CANDIDATE_ADMISSION).toBeUndefined();
  expect(env.PAPERCLIP_RUNNER_ACPX_QUALIFICATION).toBeUndefined();
  expect(buildPaperclipServerEnvironment(ambient).PAPERCLIP_ACPX_CANDIDATE_ADMISSION).toBeUndefined();
});

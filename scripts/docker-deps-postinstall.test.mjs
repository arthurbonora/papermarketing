import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("dependency stage and workspace postinstall exclude retired provider installers", async () => {
  const root = new URL("../", import.meta.url);
  const read = file => readFile(new URL(file, root), "utf8");
  const dockerfile = await read("Dockerfile");
  const dependencies = dockerfile.split(/^FROM .* AS deps\s*$/im)[1]?.split(/^FROM /im)[0];
  assert.ok(dependencies, "dependency stage exists");
  assert.doesNotMatch(dependencies, /install-copilot-assets|copilot-connection-probe/);
  for (const file of ["packages/paperclip-runner/package.json", "server/package.json"]) {
    const manifest = JSON.parse(await read(file));
    assert.doesNotMatch(manifest.scripts?.postinstall ?? "", /install-copilot-assets/);
  }
});

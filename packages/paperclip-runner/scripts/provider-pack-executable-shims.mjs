import { chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function writePortableExecutableShim(packRoot, name, executable) {
  const shimPath = join(packRoot, "node_modules", ".bin", name);
  writeFileSync(
    shimPath,
    [
      "#!/bin/sh",
      "set -eu",
      'basedir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)',
      `exec "$basedir/../${executable}" "$@"`,
      "",
    ].join("\n"),
  );
  chmodSync(shimPath, 0o755);
}

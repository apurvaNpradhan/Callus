import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const generatedTargets = [
  {
    entrypoints: [
      "packages/i18n/src/paraglide/messages/_index.js",
      "packages/i18n/src/paraglide/messages.js",
      "packages/i18n/src/paraglide/registry.js",
      "packages/i18n/src/paraglide/runtime.js",
      "packages/i18n/src/paraglide/server.js"
    ],
    buildTarget: "build:web"
  },
  {
    entrypoints: [
      "packages/i18n/src/paraglide-native/messages/_index.js",
      "packages/i18n/src/paraglide-native/messages.js",
      "packages/i18n/src/paraglide-native/registry.js",
      "packages/i18n/src/paraglide-native/runtime.js",
      "packages/i18n/src/paraglide-native/server.js"
    ],
    buildTarget: "build:native"
  }
];

for (const { entrypoints, buildTarget } of generatedTargets) {
  if (entrypoints.every(existsSync)) continue;

  const result = spawnSync("vp", ["run", "--filter", "@callus/i18n", buildTarget], {
    stdio: "inherit"
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

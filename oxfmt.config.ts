import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "bun.lock",
    "**/routeTree.gen.ts",
    ".tanstack-start",
    ".tanstack",
    "drizzle",
    "migrations",
    ".drizzle",
    ".cache",
    ".turbo",
    "worker-configuration.d.ts",
    ".vercel",
    ".output",
    ".wrangler",
    ".netlify",
    "dist",
    "**/src/lib/api/schema.d.ts",
    "apps/native/uniwind-types.d.ts",
    "apps/native/global.css",
    "**/*.md",
  ],
  sortImports: {
    customGroups: [
      {
        elementNamePattern: ["@callus/**"],
        groupName: "@callus",
      },
    ],
    groups: [
      "builtin",
      "external",
      "@callus",
      "internal",
      ["parent", "sibling", "index"],
      "style",
      "unknown",
    ],
    internalPattern: ["@/", "#@/", "~/", "~~/", "#"],
    sortSideEffects: true,
  },
  sortPackageJson: true,
  sortTailwindcss: {
    attributes: ["class", "className"],
    functions: ["clsx", "cn", "cva", "tw"],
    stylesheet: "./packages/ui/src/styles/globals.css",
  },
  trailingComma: "all",
});

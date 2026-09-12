import { defineConfig } from "oxlint";

export default defineConfig({
  env: {
    browser: true,
    builtin: true,
    node: true,
  },
  ignorePatterns: [
    "dist",
    ".wrangler",
    ".vercel",
    ".netlify",
    ".output",
    "build",
    "worker-configuration.d.ts",
    "apps/native/uniwind-types.d.ts",
    "**/routeTree.gen.ts",
    "**/*.md",
  ],
  plugins: [
    "eslint",
    "react",
    "react-perf",
    "jsx-a11y",
    "typescript",
    "import",
    "promise",
    "unicorn",
    "oxc",
    "node",
  ],
  categories: {
    correctness: "error",
  },
  overrides: [
    {
      files: ["packages/ui/src/components/label.tsx"],
      rules: {
        "jsx-a11y/label-has-associated-control": "off",
      },
    },
    {
      // Reanimated shared values are mutable by design — every `.value =`
      // write trips the React Compiler immutability rule.
      files: ["apps/native/src/components/common-tab-bar/**"],
      rules: {
        "react/immutability": "off",
      },
    },
  ],
  rules: {
    "no-console": ["warn", { allow: ["debug", "log"] }],
    "typescript/no-explicit-any": "error",
    "typescript/consistent-type-imports": [
      "error",
      { fixStyle: "inline-type-imports", prefer: "type-imports" },
    ],
    "import/no-relative-parent-imports": "error",
    "react/jsx-fragments": ["error", "syntax"],
    "jsx-a11y/no-redundant-roles": "error",
  },
});

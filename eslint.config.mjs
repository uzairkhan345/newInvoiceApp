import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    // Local-only reference material (gitignored) — never present in a
    // fresh checkout or the redesign worktree, but when it exists on disk
    // in this checkout ESLint picks up its large compiled bundle otherwise.
    "ui_redesign_handoff_v3/**",
  ]),
]);

export default eslintConfig;

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    // Integration tests share one live local Postgres instance and assert
    // on before/after global aggregate counts (M10 dashboard queries) —
    // concurrent test files mutating the same tables mid-assertion produces
    // real, non-deterministic failures. Serializing file execution costs
    // nothing at this suite's size (well under a second either way).
    fileParallelism: false,
    server: {
      deps: {
        // M28.7 — next-auth's own "next/server" import trips Next's
        // package.json#exports map when Node resolves it natively (the
        // default for externalized SSR deps); inlining routes it through
        // Vite's resolver instead, where vi.mock("next/server", ...) can
        // also actually intercept it.
        inline: ["next-auth", "@auth/core", "@auth/prisma-adapter"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

// Loads .env.local (Next.js's local-dev env file convention, see execution_plan.md §13)
// rather than a plain .env, so the Prisma CLI and the Next.js app read the same source.
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});

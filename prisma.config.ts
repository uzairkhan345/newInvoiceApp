// Loads .env.local (Next.js's local-dev env file convention)
// rather than a plain .env, so the Prisma CLI and the Next.js app read the same source.
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

// Fall back to docker-compose.yml's default connection string so `prisma
// generate` (run by the postinstall hook) works on a fresh clone before
// .env.local exists. Matches .env.local.example — a real .env.local always
// wins once created.
process.env.DATABASE_URL ??=
  "postgresql://newinvoice:newinvoice@localhost:5432/newinvoice?schema=public";

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

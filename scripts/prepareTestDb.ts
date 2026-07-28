/**
 * Pretest hook (`pnpm test` runs this automatically): makes sure the
 * dedicated test database exists and is migrated to the current schema, so
 * the suite never touches the development database in DATABASE_URL. Safe to
 * run repeatedly; the only statement it ever issues outside the test
 * database is CREATE DATABASE.
 */
import { execSync } from "node:child_process";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { resolveTestDatabaseUrl } from "../tests/testDatabaseUrl";

config({ path: ".env.local" });

// Same fresh-clone fallback as prisma.config.ts — the docker-compose default.
process.env.DATABASE_URL ??=
  "postgresql://newinvoice:newinvoice@localhost:5432/newinvoice?schema=public";

const testUrl = resolveTestDatabaseUrl();
const testDbName = new URL(testUrl).pathname.slice(1);

async function ensureTestDatabaseExists() {
  // CREATE DATABASE must run from a connection to another database on the
  // same server; the main DATABASE_URL connection is only used for this one
  // statement.
  const admin = new PrismaClient();
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
    console.log(`[prepareTestDb] created database "${testDbName}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already exists")) throw error;
  } finally {
    await admin.$disconnect();
  }
}

async function main() {
  await ensureTestDatabaseExists();
  execSync("pnpm prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
  console.log(`[prepareTestDb] test database "${testDbName}" is ready`);
}

main().catch((error) => {
  console.error("[prepareTestDb] failed:", error);
  process.exit(1);
});

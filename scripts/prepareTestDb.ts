/**
 * Pretest hook (`pnpm test` runs this automatically): makes sure the
 * dedicated test database exists and is migrated to the current schema, so
 * the suite never touches the development database in DATABASE_URL. Safe to
 * run repeatedly; the only statement it ever issues outside the test
 * database is CREATE DATABASE.
 *
 * Also clears User/Session every run: userService.test.ts's "only admin"
 * tests assume zero pre-existing admins (unlike business-data tests, which
 * tolerate ambient rows via a captured "before" baseline — see
 * tests/integration's pattern). A stray admin left behind by
 * scripts/createTestSession.ts (used for authenticated manual browser
 * verification against this same DB) silently broke those tests once
 * already; this guarantees a clean auth baseline regardless. Business data
 * (Party/Project/Invoice/etc.) is untouched, so manually-seeded scenario
 * data survives across test runs as intended.
 *
 * Note: don't run `pnpm test` while relying on a live createTestSession.ts
 * cookie in a browser against this DB — this deletes that Session row too.
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

async function resetAuthTables() {
  const test = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    const { count: sessions } = await test.session.deleteMany();
    const { count: users } = await test.user.deleteMany();
    if (sessions || users) {
      console.log(
        `[prepareTestDb] cleared ${users} user(s) and ${sessions} session(s) left over from manual testing`,
      );
    }
  } finally {
    await test.$disconnect();
  }
}

async function main() {
  await ensureTestDatabaseExists();
  execSync("pnpm prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
  await resetAuthTables();
  console.log(`[prepareTestDb] test database "${testDbName}" is ready`);
}

main().catch((error) => {
  console.error("[prepareTestDb] failed:", error);
  process.exit(1);
});

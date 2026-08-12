/**
 * M28.7 — mints a real database Session for an existing (or newly-upserted)
 * User, directly via Prisma, so a live browser walkthrough can be
 * authenticated without driving a real Google OAuth handshake — the same
 * "seed User/Session rows directly via Prisma, hand the cookie to the
 * browser" approach the automated integration tests use. See
 * Docs/internal/feedback_backlog.md's M28 "Testing/verification" decision.
 *
 * Usage: pnpm tsx scripts/createTestSession.ts <email> [role]
 *   role defaults to ADMIN; one of ADMIN | STANDARD | RESTRICTED.
 *
 * Prints the cookie name/value to set in the browser (e.g. via
 * `document.cookie = "<name>=<value>; path=/"` against the running app) —
 * remember the app must be running against the SAME database this script
 * just wrote to (never point a browser carrying real UI screenshots at the
 * dev DB — seed the test DB and run `DATABASE_URL=<test-url> pnpm next dev`
 * instead, per CLAUDE.md).
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient, type Role } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const VALID_ROLES: Role[] = ["ADMIN", "STANDARD", "RESTRICTED"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const email = process.argv[2];
  const role = (process.argv[3] ?? "ADMIN") as Role;

  if (!email || !EMAIL_PATTERN.test(email)) {
    console.error(
      "Usage: pnpm tsx scripts/createTestSession.ts <email> [role]",
    );
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`role must be one of ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role },
      create: { email, role },
    });

    const sessionToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: { sessionToken, userId: user.id, expires },
    });

    console.log(`[createTestSession] ${user.email} (${user.role}) ready.`);
    console.log(`Cookie name:  authjs.session-token`);
    console.log(`Cookie value: ${sessionToken}`);
    console.log(`Expires:      ${expires.toISOString()}`);
    console.log(
      `\nSet it in the browser (http:// origin only — this is the non-secure cookie name):\n` +
        `  document.cookie = "authjs.session-token=${sessionToken}; path=/";`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[createTestSession] failed:", error);
  process.exit(1);
});

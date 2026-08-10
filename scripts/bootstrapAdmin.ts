/**
 * M28 — bootstraps (or promotes) an admin User. Needed once per
 * deployment: no self-registration exists, so the very first admin can't
 * be added through the app's own /settings/users screen (nothing to add
 * them from). Safe to re-run — upserts, so it also works as a recovery
 * tool if every admin account is ever accidentally demoted/removed.
 *
 * Usage: pnpm tsx scripts/bootstrapAdmin.ts <email>
 *
 * Deliberately takes the email as a CLI argument rather than hardcoding
 * one — this file is committed (not gitignored, unlike the real-data
 * ingestion scripts), so it must work identically for a fork/self-host as
 * it does here. See Docs/internal/feedback_backlog.md's M28 section.
 */
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const email = process.argv[2];
  if (!email || !EMAIL_PATTERN.test(email)) {
    console.error("Usage: pnpm tsx scripts/bootstrapAdmin.ts <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN" },
      create: { email, role: "ADMIN" },
    });
    console.log(`[bootstrapAdmin] ${user.email} is now an ADMIN.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[bootstrapAdmin] failed:", error);
  process.exit(1);
});

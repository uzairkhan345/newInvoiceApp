import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

/**
 * M28.7 — direct-Prisma User/Session fixtures, the sanctioned alternative to
 * driving a real Google OAuth handshake in tests (see
 * Docs/internal/feedback_backlog.md's M28 "Testing/verification" decision).
 * `[test]`-prefixed like every other fixture in this suite.
 */

export const AUTH_SESSION_COOKIE_NAME = "authjs.session-token";

export async function createTestUserWithSession(role: Role = "ADMIN") {
  const suffix = randomBytes(6).toString("hex");
  const user = await prisma.user.create({
    data: {
      name: `[test] ${role} User`,
      email: `test-${suffix}@example.com`,
      role,
    },
  });
  const sessionToken = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return { user, sessionToken };
}

/** Session/Account rows cascade on User delete — nothing else to clean up. */
export async function deleteTestUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

export function authCookieHeader(sessionToken: string | null): string {
  return sessionToken ? `${AUTH_SESSION_COOKIE_NAME}=${sessionToken}` : "";
}

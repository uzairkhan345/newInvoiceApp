// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTestUserWithSession,
  deleteTestUser,
  authCookieHeader,
} from "../helpers/authFixtures";

/**
 * M28.7 — `requireSession`/`requireRole` call Auth.js's `auth()`, which
 * (called with no args, as it is from a Server Action) reads the request via
 * `headers()` from `next/headers` rather than `cookies()` — see
 * next-auth's `lib/index.ts`. Mocking that one function, with a real
 * Prisma-seeded `Session` row behind the token it reports, exercises the
 * exact same adapter DB lookup and `session` callback production code uses.
 */
const sessionState = vi.hoisted(() => ({ cookie: "" }));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "x-forwarded-proto": "http",
      host: "localhost:3001",
      cookie: sessionState.cookie,
    }),
}));

// next-auth statically imports NextResponse/NextRequest from "next/server"
// for code paths this app never hits (route-handler wrapping); Next's
// package.json#exports map isn't resolvable from outside a Next.js build
// (Vitest included — next-auth's own source flags this as a known gap), so
// the import needs a stand-in, not real behavior.
vi.mock("next/server", () => ({
  NextResponse: class NextResponse {},
  NextRequest: class NextRequest {},
}));

// Auth.js only trusts the request's host header when it detects it's
// running inside a real Next.js server (Vercel, or a set AUTH_URL) —
// outside that, `assertConfig` rejects every request as an untrusted
// host before it even looks at cookies. Harmless outside prod: this only
// controls host-header trust, not anything session-validity-related.
process.env.AUTH_TRUST_HOST = "true";
// Local dev may not have generated a real AUTH_SECRET yet (M28's Google
// setup is still in progress) — tests must not depend on that being done.
// The DB session strategy doesn't use it cryptographically; Auth.js just
// unconditionally requires the config field to be non-empty.
if (!process.env.AUTH_SECRET)
  process.env.AUTH_SECRET = "test-only-not-a-real-secret";

const { requireSession, requireRole } = await import("@/lib/authz");

const createdUserIds: string[] = [];

afterEach(async () => {
  sessionState.cookie = "";
  while (createdUserIds.length) {
    await deleteTestUser(createdUserIds.pop()!);
  }
});

describe("authz", () => {
  it("requireSession fails closed when there is no session cookie", async () => {
    const result = await requireSession();
    expect(result.ok).toBe(false);
  });

  it("requireSession succeeds against a real Prisma-seeded session", async () => {
    const { user, sessionToken } = await createTestUserWithSession("STANDARD");
    createdUserIds.push(user.id);
    sessionState.cookie = authCookieHeader(sessionToken);

    const result = await requireSession();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.user.id).toBe(user.id);
    expect(result.session.user.role).toBe("STANDARD");
  });

  it("requireRole rejects a valid session whose role isn't in the allowed list", async () => {
    const { user, sessionToken } =
      await createTestUserWithSession("RESTRICTED");
    createdUserIds.push(user.id);
    sessionState.cookie = authCookieHeader(sessionToken);

    const result = await requireRole(["ADMIN"]);

    expect(result.ok).toBe(false);
  });

  it("requireRole succeeds when the session's role is in the allowed list", async () => {
    const { user, sessionToken } = await createTestUserWithSession("ADMIN");
    createdUserIds.push(user.id);
    sessionState.cookie = authCookieHeader(sessionToken);

    const result = await requireRole(["ADMIN", "STANDARD"]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.user.role).toBe("ADMIN");
  });

  it("requireRole fails closed when there is no session at all", async () => {
    const result = await requireRole(["ADMIN"]);
    expect(result.ok).toBe(false);
  });
});

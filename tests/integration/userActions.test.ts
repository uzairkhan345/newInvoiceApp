// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { userService, LastAdminError } from "@/services/userService";
import {
  createTestUserWithSession,
  deleteTestUser,
  authCookieHeader,
} from "../helpers/authFixtures";

/** See tests/integration/authz.test.ts for why `next/headers` is what needs mocking. */
const sessionState = vi.hoisted(() => ({ cookie: "" }));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "x-forwarded-proto": "http",
      host: "localhost:3001",
      cookie: sessionState.cookie,
    }),
}));

// See tests/integration/authz.test.ts for why this stand-in is needed.
vi.mock("next/server", () => ({
  NextResponse: class NextResponse {},
  NextRequest: class NextRequest {},
}));

// revalidatePath needs Next's request-scoped static-generation store, which
// only exists inside a real Next.js render/action invocation — outside of
// one (as here), it throws. The actions under test don't return anything
// cache-related for this test to assert on, so a no-op stand-in is enough.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// See tests/integration/authz.test.ts for why these are needed.
process.env.AUTH_TRUST_HOST = "true";
if (!process.env.AUTH_SECRET)
  process.env.AUTH_SECRET = "test-only-not-a-real-secret";

const { createUserAction, updateUserRoleAction, deleteUserAction } =
  await import("@/actions/user.actions");

const createdUserIds: string[] = [];

function trackAndSetSession(userId: string, sessionToken: string) {
  createdUserIds.push(userId);
  sessionState.cookie = authCookieHeader(sessionToken);
}

afterEach(async () => {
  sessionState.cookie = "";
  while (createdUserIds.length) {
    await deleteTestUser(createdUserIds.pop()!);
  }
});

describe("user.actions (M28.7 — real requireRole gate, not an assumed-open route)", () => {
  it("createUserAction rejects a signed-out caller", async () => {
    const result = await createUserAction({
      email: "test-nobody@example.com",
      role: "RESTRICTED",
    });

    expect(result.success).toBe(false);
  });

  it("createUserAction rejects a non-admin caller", async () => {
    const { user, sessionToken } = await createTestUserWithSession("STANDARD");
    trackAndSetSession(user.id, sessionToken);

    const result = await createUserAction({
      email: "test-should-not-be-created@example.com",
      role: "RESTRICTED",
    });

    expect(result.success).toBe(false);
    await expect(
      prisma.user.findUnique({
        where: { email: "test-should-not-be-created@example.com" },
      }),
    ).resolves.toBeNull();
  });

  it("createUserAction succeeds for an admin caller", async () => {
    const { user, sessionToken } = await createTestUserWithSession("ADMIN");
    trackAndSetSession(user.id, sessionToken);

    const result = await createUserAction({
      email: "test-new-user@example.com",
      role: "RESTRICTED",
    });

    expect(result.success).toBe(true);
    if (result.success) createdUserIds.push(result.data.id);
  });

  it("updateUserRoleAction and deleteUserAction surface the last-admin guard through the action layer", async () => {
    const { user, sessionToken } = await createTestUserWithSession("ADMIN");
    trackAndSetSession(user.id, sessionToken);

    // The real last-admin *count* logic is covered deterministically in
    // tests/unit/userService.test.ts (mocked repository) — it can't be
    // exercised safely here against a real DB, since the global admin count
    // isn't something this suite can guarantee is exactly one (a real
    // account bootstrapped for manual browser testing may legitimately
    // coexist). This test only verifies the action layer correctly maps a
    // LastAdminError into a { success: false } result, not that the error
    // itself is triggered by real ambient state.
    const updateRoleSpy = vi
      .spyOn(userService, "updateRole")
      .mockRejectedValueOnce(new LastAdminError());
    const deleteSpy = vi
      .spyOn(userService, "delete")
      .mockRejectedValueOnce(new LastAdminError());

    const demote = await updateUserRoleAction(user.id, "STANDARD");
    expect(demote.success).toBe(false);

    const remove = await deleteUserAction(user.id);
    expect(remove.success).toBe(false);

    updateRoleSpy.mockRestore();
    deleteSpy.mockRestore();

    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    ).resolves.toMatchObject({ role: "ADMIN" });
  });
});

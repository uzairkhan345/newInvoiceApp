import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The "only admin" guard counts admins across the whole DB with no
 * scoping (assertNotLastAdmin), so testing it against a real database
 * would require the DB to hold exactly one admin globally — unsafe to
 * assume in tests/integration/userService.test.ts, where a real account
 * (e.g. one bootstrapped for manual browser testing) may legitimately
 * coexist with test fixtures. Mocking the repository here makes the
 * boundary condition fully deterministic regardless of ambient DB state.
 */
const findById = vi.fn();
const countByRole = vi.fn();
const updateRole = vi.fn();
const deleteById = vi.fn();

vi.mock("@/repositories/userRepository", () => ({
  userRepository: {
    findById: (...args: unknown[]) => findById(...args),
    countByRole: (...args: unknown[]) => countByRole(...args),
    updateRole: (...args: unknown[]) => updateRole(...args),
    deleteById: (...args: unknown[]) => deleteById(...args),
  },
}));

const { userService, LastAdminError, wouldRemoveLastAdmin } =
  await import("@/services/userService");

afterEach(() => {
  findById.mockReset();
  countByRole.mockReset();
  updateRole.mockReset();
  deleteById.mockReset();
});

describe("wouldRemoveLastAdmin", () => {
  it("blocks when the target is the only admin", () => {
    expect(wouldRemoveLastAdmin(true, 1)).toBe(true);
  });

  it("blocks defensively even if the count is somehow already below one", () => {
    expect(wouldRemoveLastAdmin(true, 0)).toBe(true);
  });

  it("allows when another admin remains", () => {
    expect(wouldRemoveLastAdmin(true, 2)).toBe(false);
  });

  it("is irrelevant for a non-admin target regardless of count", () => {
    expect(wouldRemoveLastAdmin(false, 1)).toBe(false);
    expect(wouldRemoveLastAdmin(false, 0)).toBe(false);
  });
});

describe("userService — last-admin guard wiring", () => {
  it("blocks demoting the only admin, independent of ambient DB state", async () => {
    findById.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    countByRole.mockResolvedValue(1);

    await expect(
      userService.updateRole("admin-1", "STANDARD"),
    ).rejects.toBeInstanceOf(LastAdminError);
    expect(updateRole).not.toHaveBeenCalled();
  });

  it("blocks deleting the only admin, independent of ambient DB state", async () => {
    findById.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    countByRole.mockResolvedValue(1);

    await expect(userService.delete("admin-1")).rejects.toBeInstanceOf(
      LastAdminError,
    );
    expect(deleteById).not.toHaveBeenCalled();
  });

  it("does not query the admin count at all for a non-admin target", async () => {
    findById.mockResolvedValue({ id: "user-1", role: "RESTRICTED" });
    updateRole.mockResolvedValue({ id: "user-1", role: "STANDARD" });

    await userService.updateRole("user-1", "STANDARD");

    expect(countByRole).not.toHaveBeenCalled();
    expect(updateRole).toHaveBeenCalledWith("user-1", "STANDARD");
  });
});

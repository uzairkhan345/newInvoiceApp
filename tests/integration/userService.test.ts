// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { userService, DuplicateUserEmailError } from "@/services/userService";
import { deleteTestUser } from "../helpers/authFixtures";

const createdUserIds: string[] = [];

async function createUser(
  email: string,
  role: "ADMIN" | "STANDARD" | "RESTRICTED",
) {
  const user = await userService.create({ email, role });
  createdUserIds.push(user.id);
  return user;
}

afterEach(async () => {
  while (createdUserIds.length) {
    await deleteTestUser(createdUserIds.pop()!);
  }
});

describe("userService (M28.3 business logic, first covered by M28.7)", () => {
  it("creates a user and lists it", async () => {
    const user = await createUser("test-list@example.com", "RESTRICTED");

    const all = await userService.list();
    expect(all.map((u) => u.id)).toContain(user.id);
  });

  it("rejects a duplicate email", async () => {
    await createUser("test-dup@example.com", "RESTRICTED");

    await expect(
      userService.create({ email: "test-dup@example.com", role: "STANDARD" }),
    ).rejects.toBeInstanceOf(DuplicateUserEmailError);
  });

  // "Blocks demoting/deleting the only admin" is NOT tested here: that
  // scenario requires the whole DB to hold exactly one admin globally
  // (assertNotLastAdmin counts admins with no scoping), which this suite
  // can't safely guarantee — real accounts (e.g. an admin bootstrapped for
  // manual browser testing against this same DB) may legitimately exist
  // alongside these fixtures. That boundary condition is fully covered,
  // deterministically, in tests/unit/userService.test.ts instead, via a
  // mocked repository. This file only covers the DB-wiring/"allowed" paths,
  // which don't depend on the ambient admin count being exactly zero.

  it("allows demoting an admin when another admin remains", async () => {
    const admin1 = await createUser("test-admin-one@example.com", "ADMIN");
    await createUser("test-admin-two@example.com", "ADMIN");

    const demoted = await userService.updateRole(admin1.id, "STANDARD");

    expect(demoted.role).toBe("STANDARD");
  });

  it("allows deleting a non-admin freely", async () => {
    const user = await createUser("test-deletable@example.com", "RESTRICTED");

    await expect(userService.delete(user.id)).resolves.toBeUndefined();
    createdUserIds.splice(createdUserIds.indexOf(user.id), 1);
  });
});

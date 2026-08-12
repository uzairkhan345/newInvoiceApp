// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  userService,
  DuplicateUserEmailError,
  LastAdminError,
} from "@/services/userService";
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

  it("blocks demoting the only admin", async () => {
    const admin = await createUser("test-only-admin@example.com", "ADMIN");

    await expect(
      userService.updateRole(admin.id, "STANDARD"),
    ).rejects.toBeInstanceOf(LastAdminError);
  });

  it("allows demoting an admin when another admin remains", async () => {
    const admin1 = await createUser("test-admin-one@example.com", "ADMIN");
    await createUser("test-admin-two@example.com", "ADMIN");

    const demoted = await userService.updateRole(admin1.id, "STANDARD");

    expect(demoted.role).toBe("STANDARD");
  });

  it("blocks deleting the only admin", async () => {
    const admin = await createUser("test-only-admin-del@example.com", "ADMIN");

    await expect(userService.delete(admin.id)).rejects.toBeInstanceOf(
      LastAdminError,
    );
  });

  it("allows deleting a non-admin freely", async () => {
    const user = await createUser("test-deletable@example.com", "RESTRICTED");

    await expect(userService.delete(user.id)).resolves.toBeUndefined();
    createdUserIds.splice(createdUserIds.indexOf(user.id), 1);
  });
});

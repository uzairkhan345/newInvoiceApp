import { userRepository } from "@/repositories/userRepository";
import type { UserWriteInput } from "@/repositories/userRepository";
import type { User, Role } from "@/generated/prisma/client";

/** M28 — the email allowlist is unique; a duplicate is a user error, not a crash. */
export class DuplicateUserEmailError extends Error {
  constructor() {
    super("A user with this email already exists.");
    this.name = "DuplicateUserEmailError";
  }
}

/**
 * M28 — guards against locking every admin out of user management.
 * Everyone else's access is untouched either way; this only blocks the
 * specific action that would leave zero ADMIN rows.
 */
export class LastAdminError extends Error {
  constructor() {
    super(
      "You're the last admin — promote someone else to admin before removing or demoting yourself.",
    );
    this.name = "LastAdminError";
  }
}

function list(): Promise<User[]> {
  return userRepository.findMany();
}

async function create(input: UserWriteInput): Promise<User> {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) {
    throw new DuplicateUserEmailError();
  }
  return userRepository.create(input);
}

async function assertNotLastAdmin(id: string): Promise<void> {
  const target = await userRepository.findById(id);
  if (target?.role !== "ADMIN") return;
  const adminCount = await userRepository.countByRole("ADMIN");
  if (adminCount <= 1) {
    throw new LastAdminError();
  }
}

async function updateRole(id: string, role: Role): Promise<User> {
  if (role !== "ADMIN") {
    await assertNotLastAdmin(id);
  }
  return userRepository.updateRole(id, role);
}

async function remove(id: string): Promise<void> {
  await assertNotLastAdmin(id);
  await userRepository.delete(id);
}

export const userService = {
  list,
  create,
  updateRole,
  delete: remove,
};

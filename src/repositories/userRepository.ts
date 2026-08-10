import { prisma } from "@/lib/prisma";
import type { User, Role } from "@/generated/prisma/client";

/** M28. Thin Prisma wrappers only — no validation, no business rules. */
export type UserWriteInput = {
  email: string;
  role: Role;
};

function findMany(): Promise<User[]> {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}

function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

function create(data: UserWriteInput): Promise<User> {
  return prisma.user.create({ data });
}

function updateRole(id: string, role: Role): Promise<User> {
  return prisma.user.update({ where: { id }, data: { role } });
}

function deleteById(id: string): Promise<User> {
  return prisma.user.delete({ where: { id } });
}

function countByRole(role: Role): Promise<number> {
  return prisma.user.count({ where: { role } });
}

export const userRepository = {
  findMany,
  findById,
  findByEmail,
  create,
  updateRole,
  delete: deleteById,
  countByRole,
};

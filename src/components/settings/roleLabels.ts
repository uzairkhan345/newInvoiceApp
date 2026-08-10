import type { Role } from "@/generated/prisma/client";

/** M28 — shared between UserForm's select and UserRow's inline role picker. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  STANDARD: "Standard",
  RESTRICTED: "Restricted",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full access, including these settings.",
  STANDARD: "Full access except these settings.",
  RESTRICTED:
    "Full invoice access, but can't create, edit, or delete projects, parties, or payment methods.",
};

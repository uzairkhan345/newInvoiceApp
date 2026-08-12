import type { Role } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";

/** M28 — extends Auth.js's default session/user shape with our own `role`. */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

import { z } from "zod";

/** M28. Role dropdown default is the most restrictive value — granting
 * broader access is always a conscious admin choice, not a default. */
export const userSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(["ADMIN", "STANDARD", "RESTRICTED"]),
});

export type UserInput = z.infer<typeof userSchema>;

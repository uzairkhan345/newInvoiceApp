import { z } from "zod";

/**
 * Docs/mvp_user_stories.md Story 1.1: Name required; Email optional but
 * validated if present; Type is the only classification field (no Role —
 * Docs/implementation_decisions.md §15); address is a single inlined set of
 * optional fields (§16).
 */
export const partySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      {
        message: "Enter a valid email address",
      },
    ),
  type: z.enum(["INDIVIDUAL", "ORGANIZATION"], {
    message: "Select a party type",
  }),
  street1: z.string().trim().optional().or(z.literal("")),
  street2: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  postalCode: z.string().trim().optional().or(z.literal("")),
  country: z.string().trim().optional().or(z.literal("")),
});

export type PartyInput = z.infer<typeof partySchema>;

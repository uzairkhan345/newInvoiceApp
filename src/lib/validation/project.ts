import { z } from "zod";

/**
 * Docs/mvp_user_stories.md Story 3.1/3.2: Name, Contractor, and Client are
 * required (picked from the unified party list — Docs/implementation_decisions.md
 * §15); Abbreviation and PreferredPaymentMethod are optional; InvoiceNumberFormat
 * is a plain text template validated for its placeholders at generation time
 * (invoiceNumberService, M5), not here; DisplayCurrency defaults to USD.
 */
export const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  abbreviation: z.string().trim().optional().or(z.literal("")),
  clientId: z.string().trim().min(1, "Select a client"),
  contractorId: z.string().trim().min(1, "Select a contractor"),
  preferredPaymentMethodId: z.string().trim().optional().or(z.literal("")),
  invoiceNumberFormat: z
    .string()
    .trim()
    .min(1, "Invoice number format is required"),
  invoicePeriodType: z
    .enum(["WEEKLY", "SEMI_MONTHLY", "MONTHLY"])
    .optional()
    .or(z.literal("")),
  displayCurrency: z.enum(["USD", "AUD", "GBP"], {
    message: "Select a display currency",
  }),
  status: z.enum(["ACTIVE", "ARCHIVED"], {
    message: "Select a status",
  }),
});

export type ProjectInput = z.infer<typeof projectSchema>;

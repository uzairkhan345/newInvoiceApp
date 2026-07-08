import type { PaymentMethodFieldInput } from "@/lib/validation/paymentMethod";

/**
 * Docs/product_spec.md §4 Workflow 2 — "pick a template ... fill in the
 * dynamic fields, optionally override field labels." These are starting
 * scaffolds only, editable/removable/extendable after loading — never
 * persisted as-is without the admin's review. CUSTOM has no template since
 * it's the free-form escape hatch.
 */
export const paymentMethodTemplates: Record<string, PaymentMethodFieldInput[]> =
  {
    BANK_WIRE: [
      { key: "bank_name", label: "Bank Name", value: "" },
      { key: "account_number", label: "Account Number", value: "" },
      { key: "routing_number", label: "Routing Number (ABA)", value: "" },
      { key: "swift_bic", label: "SWIFT / BIC Code", value: "" },
    ],
    ZELLE: [{ key: "zelle_tag", label: "Zelle Registered Email", value: "" }],
    PAYONEER: [{ key: "payoneer_email", label: "Payoneer Email", value: "" }],
    CUSTOM: [],
  };

/**
 * Docs/ui_design_guide.md §17/§19 — every amount renders with an explicit
 * currency indicator via Intl.NumberFormat; never a hardcoded `$` in a shared
 * component, since the converted-total figure can be AUD/GBP.
 */
export function formatCurrency(
  amount: number | string,
  currency: string,
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

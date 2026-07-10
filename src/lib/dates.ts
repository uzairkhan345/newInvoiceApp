/**
 * Docs/execution_plan.md §9 — the two supported {date} token formats for
 * invoice numbers. There is no separate Project.dateFormat schema column
 * (see Docs/execution_plan.md §9's M5 note) — the format is chosen inline in
 * the invoiceNumberFormat string itself via `{date:MM-DD-YYYY}` /
 * `{date:DD-MM-YYYY}`, defaulting to MM-DD-YYYY for a bare `{date}`.
 */
export type InvoiceDateFormat = "MM-DD-YYYY" | "DD-MM-YYYY";

export function formatDateToken(
  date: Date,
  format: InvoiceDateFormat = "MM-DD-YYYY",
): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return format === "DD-MM-YYYY"
    ? `${dd}-${mm}-${yyyy}`
    : `${mm}-${dd}-${yyyy}`;
}

/** `<input type="date">` value (yyyy-mm-dd) for a stored `@db.Date` value. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Human-friendly display date for list/detail views. */
export function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Docs/execution_plan.md §8 — OVERDUE is `status === SENT && dueDate < today`,
 * compared as UTC dates (matching how `@db.Date` columns are stored/read)
 * rather than against the server's local wall-clock time.
 */
export function isOverdue(dueDate: Date): boolean {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return dueDate.getTime() < today;
}

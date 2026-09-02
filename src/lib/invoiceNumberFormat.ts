import { formatDateToken, type InvoiceDateFormat } from "@/lib/dates";

/**
 * Shared token grammar for Project.invoiceNumberFormat — the single source
 * of truth for both real generation (invoiceNumberService.ts's
 * generateInvoiceNumber) and the format field's discoverability popover
 * (InvoiceNumberFormatHelp.tsx), so the two can never drift out of sync.
 */
export const INVOICE_NUMBER_TOKEN_PATTERN =
  /\{abbreviation\}|\{number\}|\{year_short\}|\{year\}|\{month\}|\{day\}|\{date(?::(MM-DD-YYYY|DD-MM-YYYY|MM\/DD\/YYYY|DD\/MM\/YYYY))?\}/g;

export type InvoiceNumberTokenValues = {
  abbreviation: string;
  number: string;
  now: Date;
};

/** Pure substitution — no padding/sequence logic here, callers supply the already-resolved `number` string. */
export function applyInvoiceNumberTokens(
  format: string,
  values: InvoiceNumberTokenValues,
): string {
  return format.replace(
    INVOICE_NUMBER_TOKEN_PATTERN,
    (fullMatch, dateFormatGroup: InvoiceDateFormat | undefined) => {
      if (fullMatch.startsWith("{abbreviation}")) return values.abbreviation;
      if (fullMatch.startsWith("{number}")) return values.number;
      if (fullMatch === "{year_short}")
        return String(values.now.getFullYear()).slice(-2);
      if (fullMatch === "{year}") return String(values.now.getFullYear());
      if (fullMatch === "{month}")
        return String(values.now.getMonth() + 1).padStart(2, "0");
      if (fullMatch === "{day}")
        return String(values.now.getDate()).padStart(2, "0");
      return formatDateToken(values.now, dateFormatGroup ?? "MM-DD-YYYY");
    },
  );
}

export type InvoiceNumberTokenInfo = {
  token: string;
  description: string;
  /** Resolved against `now` (or today) so the reference popover always shows a currently-accurate sample. */
  sample: string;
};

/** Drives the format field's help popover — every row here is a real, generator-recognized token. */
export function getInvoiceNumberTokenReference(
  now: Date = new Date(),
): InvoiceNumberTokenInfo[] {
  return [
    {
      token: "{abbreviation}",
      description: "Project's short code, auto-derived from the name if unset",
      sample: "ACM",
    },
    {
      token: "{number}",
      description: "Sequential invoice number, zero-padded to at least 2 digits",
      sample: "03",
    },
    {
      token: "{year}",
      description: "Current 4-digit year",
      sample: String(now.getFullYear()),
    },
    {
      token: "{year_short}",
      description: "Current year, last 2 digits",
      sample: String(now.getFullYear()).slice(-2),
    },
    {
      token: "{month}",
      description: "Current month, zero-padded",
      sample: String(now.getMonth() + 1).padStart(2, "0"),
    },
    {
      token: "{day}",
      description: "Current day of month, zero-padded",
      sample: String(now.getDate()).padStart(2, "0"),
    },
    {
      token: "{date}",
      description: "Current date, defaults to MM-DD-YYYY",
      sample: formatDateToken(now, "MM-DD-YYYY"),
    },
    {
      token: "{date:MM-DD-YYYY}",
      description: "Pick the shape: month-day-year",
      sample: formatDateToken(now, "MM-DD-YYYY"),
    },
    {
      token: "{date:DD-MM-YYYY}",
      description: "Pick the shape: day-month-year",
      sample: formatDateToken(now, "DD-MM-YYYY"),
    },
    {
      token: "{date:MM/DD/YYYY}",
      description: "Pick the shape: month-day-year, slashes",
      sample: formatDateToken(now, "MM/DD/YYYY"),
    },
    {
      token: "{date:DD/MM/YYYY}",
      description: "Pick the shape: day-month-year, slashes",
      sample: formatDateToken(now, "DD/MM/YYYY"),
    },
  ];
}

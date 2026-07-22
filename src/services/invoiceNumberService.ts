import { deriveAbbreviation } from "@/services/projectService";
import { formatDateToken, type InvoiceDateFormat } from "@/lib/dates";

/**
 * Docs/execution_plan.md §9 — invoice number generation. Supported tokens:
 * `{abbreviation}`, `{number}`, `{date}` (or `{date:MM-DD-YYYY}` /
 * `{date:DD-MM-YYYY}` to pick the date format inline — there is no separate
 * Project.dateFormat column, so the format string itself is the one place
 * this is configured, consistent with the docs' own format examples), and
 * `{year}` (Docs/feedback_backlog.md M19.1) — a standalone 4-digit year,
 * independent of `{date}`, for formats like `{abbreviation}-{year}-{number}`
 * that don't want a full date embedded.
 */
const TOKEN_PATTERN =
  /\{abbreviation\}|\{number\}|\{year\}|\{date(?::(MM-DD-YYYY|DD-MM-YYYY))?\}/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a regex that extracts the `{number}` token's value out of a
 * previously-generated invoice number string, treating every other token as
 * a non-greedy wildcard. Used to recover the numeric sequence even though
 * the schema has no dedicated sequence column (Docs/execution_plan.md §9:
 * "computes next {number} as max(existing sequence) + 1").
 */
function buildSequenceExtractionRegex(format: string): RegExp {
  let pattern = "";
  let lastIndex = 0;
  for (const match of format.matchAll(TOKEN_PATTERN)) {
    pattern += escapeRegExp(format.slice(lastIndex, match.index));
    pattern += match[0].startsWith("{number}") ? "(\\d+)" : ".*?";
    lastIndex = match.index! + match[0].length;
  }
  pattern += escapeRegExp(format.slice(lastIndex));
  return new RegExp(`^${pattern}$`);
}

function extractSequence(invoiceNumber: string, format: string): number | null {
  const match = invoiceNumber.match(buildSequenceExtractionRegex(format));
  if (!match || match[1] === undefined) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Next sequence is max(existing sequence) + 1, never a row count — so a
 * deleted invoice's number is never reissued, per Docs/execution_plan.md §9.
 */
export function nextSequence(
  existingInvoiceNumbers: string[],
  format: string,
): number {
  const sequences = existingInvoiceNumbers
    .map((invoiceNumber) => extractSequence(invoiceNumber, format))
    .filter((value): value is number => value !== null);
  return sequences.length === 0 ? 1 : Math.max(...sequences) + 1;
}

export type GenerateInvoiceNumberInput = {
  project: {
    abbreviation: string | null;
    name: string;
    invoiceNumberFormat: string;
  };
  existingInvoiceNumbers: string[];
  now?: Date;
};

/** Zero-padded to 2 digits by default, mirroring the reference script's `.zfill(2)`. */
function padSequence(sequence: number): string {
  return String(sequence).padStart(2, "0");
}

export function generateInvoiceNumber({
  project,
  existingInvoiceNumbers,
  now = new Date(),
}: GenerateInvoiceNumberInput): string {
  const abbreviation =
    project.abbreviation && project.abbreviation.length > 0
      ? project.abbreviation
      : deriveAbbreviation(project.name);
  const paddedNumber = padSequence(
    nextSequence(existingInvoiceNumbers, project.invoiceNumberFormat),
  );

  return project.invoiceNumberFormat.replace(
    TOKEN_PATTERN,
    (fullMatch, dateFormatGroup: InvoiceDateFormat | undefined) => {
      if (fullMatch.startsWith("{abbreviation}")) return abbreviation;
      if (fullMatch.startsWith("{number}")) return paddedNumber;
      if (fullMatch.startsWith("{year}")) return String(now.getFullYear());
      return formatDateToken(now, dateFormatGroup ?? "MM-DD-YYYY");
    },
  );
}

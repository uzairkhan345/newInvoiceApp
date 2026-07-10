import type { ReactNode } from "react";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { LockedBanner } from "@/components/invoice/LockedBanner";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";
import type {
  InvoiceDocumentData,
  PartySnapshotData,
} from "@/services/documentService";

/**
 * Docs/ui_design_guide.md §15 — the single template rendered byte-identically
 * by the on-screen preview (/invoices/[id], with app chrome) and the bare
 * print route (/invoices/[id]/print) that Puppeteer will later navigate to
 * (M9). Data comes exclusively from documentService.assembleInvoiceDocumentData.
 *
 * Letterhead layout adapted from the reference invoices in
 * ai_context/03_document_generation_reference/ (screenshots + generate_invoice.py),
 * reworked into the app's own Docketly Indigo tokens rather than copied as-is
 * — see §15's 2026-07-10 rewrite note.
 */
export function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const isLocked = data.status !== "DRAFT";
  const hasConvertedTotal =
    data.convertedTotal !== null && data.convertedCurrency !== null;

  return (
    <div className="mx-auto w-full max-w-[800px]">
      {isLocked ? <LockedBanner /> : null}
      <div className="rounded-[8px] border border-border bg-card p-5 sm:p-12">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-bold text-foreground">
              {data.contractor.name}
            </p>
            {addressLines(data.contractor).map((line) => (
              <p key={line} className="text-[13px] text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
              Invoice #
            </p>
            <p className="font-mono text-[18px] font-extrabold text-brand">
              {data.invoiceNumber}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Issued {formatDisplayDate(data.issueDate)}
            </p>
          </div>
        </header>

        <div className="my-5 h-1 w-full bg-brand" />

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">
            Invoice
          </h1>
          <StatusBadge status={data.status} dueDate={data.dueDate} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <SectionLabel>Bill To</SectionLabel>
            <PartyLines party={data.client} />
          </div>
          <div>
            <SectionLabel>Details</SectionLabel>
            <p className="text-[13px] text-foreground">{data.projectName}</p>
          </div>
          <div>
            <SectionLabel>Payment</SectionLabel>
            <p className="text-[13px] text-foreground">
              Due: {formatDisplayDate(data.dueDate)}
            </p>
          </div>
        </div>

        <table className="mb-8 w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-xs font-bold tracking-[0.05em] text-muted-foreground uppercase">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right font-mono">
                  {item.quantity}
                </td>
                <td className="py-2 text-right font-mono">
                  {formatCurrency(item.unitPrice, "USD")}
                </td>
                <td className="py-2 text-right font-mono">
                  {formatCurrency(item.amount, "USD")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-8 flex flex-col items-end gap-1">
          <p className="text-[13px] text-foreground">
            Subtotal{" "}
            <span className="ml-4 font-mono">
              {formatCurrency(data.subtotal, "USD")}
            </span>
          </p>
          <p className="text-lg font-extrabold text-foreground">
            Total{" "}
            <span className="ml-4 font-mono">
              {formatCurrency(data.total, "USD")}
            </span>
          </p>
          {hasConvertedTotal ? (
            <>
              <div className="my-1 w-56 border-t border-border" />
              <p className="text-[13px] font-bold text-muted-foreground">
                Converted Total ({data.convertedCurrency}){" "}
                <span className="ml-4 font-mono">
                  {formatCurrency(data.convertedTotal!, data.convertedCurrency!)}
                </span>
              </p>
            </>
          ) : null}
        </div>

        <div>
          <SectionLabel>Payment Details</SectionLabel>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {data.paymentDetails.map((field) => (
              <div
                key={field.key}
                className="flex justify-between gap-2 text-[13px] sm:justify-start"
              >
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="font-mono">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

function PartyLines({ party }: { party: PartySnapshotData }) {
  return (
    <>
      <p className="text-[13px] font-bold text-foreground">{party.name}</p>
      {party.email ? (
        <p className="text-[13px] text-muted-foreground">{party.email}</p>
      ) : null}
      {addressLines(party).map((line) => (
        <p key={line} className="text-[13px] text-muted-foreground">
          {line}
        </p>
      ))}
    </>
  );
}

function addressLines(party: PartySnapshotData): string[] {
  const lines: string[] = [];
  if (party.street1) lines.push(party.street1);
  if (party.street2) lines.push(party.street2);
  const cityState = [party.city, party.state].filter(Boolean).join(", ");
  const cityLine = [cityState, party.postalCode].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (party.country) lines.push(party.country);
  return lines;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

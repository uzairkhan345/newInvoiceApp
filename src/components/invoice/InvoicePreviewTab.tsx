import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import type { InvoiceDocumentData } from "@/services/documentService";

/** Invoice detail Preview tab — the exact same InvoiceDocument used by the print route/PDF, unchanged, just relocated behind a tab with a small download toolbar above it. */
export function InvoicePreviewTab({
  invoiceId,
  data,
}: {
  invoiceId: string;
  data: InvoiceDocumentData;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
        <div>
          <p className="text-[12px] font-bold text-foreground">
            Invoice preview
          </p>
          <p className="text-[11px] text-muted-foreground">
            {data.status === "DRAFT"
              ? "Still a draft — edit freely until it's marked Sent."
              : "Final locked version."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/api/invoices/${invoiceId}/excel`} target="_blank" />
            }
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/api/invoices/${invoiceId}/pdf`} target="_blank" />
            }
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/invoices/${invoiceId}/print`} target="_blank" />
            }
          >
            <Printer className="h-3.5 w-3.5" />
            Print view
          </Button>
        </div>
      </div>
      {/* Docs/invoice_design_guidelines.md §15 — the A4 page has fixed
          physical dimensions; on narrow viewports it scrolls horizontally
          rather than reflowing. */}
      <div className="overflow-x-auto">
        <InvoiceDocument data={data} />
      </div>
    </div>
  );
}

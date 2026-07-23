import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DetailField } from "@/components/shared/DetailField";
import { INVOICE_PERIOD_LABELS } from "@/lib/invoicePeriod";
import type { ProjectWithRelations } from "@/repositories/projectRepository";

const CURRENCY_LABELS: Record<ProjectWithRelations["displayCurrency"], string> =
  {
    USD: "USD",
    AUD: "AUD",
    GBP: "GBP",
    NZD: "NZD",
    AED: "AED",
    PKR: "PKR",
    SAR: "SAR",
  };

const CURRENCY_MODE_LABELS: Record<
  ProjectWithRelations["currencyMode"],
  string
> = {
  SINGLE: "Single Currency",
  DUAL: "Dual Currency",
};

const STATUS_LABELS: Record<ProjectWithRelations["status"], string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

/**
 * Read-only view of a Project — the default landing state at
 * /projects/[id], per Docs/execution_plan.md §16 M10.5. Mirrors every field
 * ProjectForm edits.
 */
export function ProjectDetailCard({
  project,
  editHref,
  nextInvoiceNumber,
}: {
  project: ProjectWithRelations;
  editHref: string;
  /** Docs/feedback_backlog.md M19.3b — same preview call the invoice create form already uses. */
  nextInvoiceNumber: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-bold text-foreground">
          Details
        </CardTitle>
        <CardAction className="flex gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 text-[12px]"
            nativeButton={false}
            render={<Link href={`/invoices/new/${project.id}`} />}
          >
            <FileText className="h-3.5 w-3.5" />
            Create Invoice
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3 text-[12px]"
            nativeButton={false}
            render={<Link href={editHref} />}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailField label="Name" value={project.name} />
        <DetailField label="Abbreviation" value={project.abbreviation ?? "—"} />
        <DetailField
          label="Service Description"
          value={project.serviceDescription ?? `${project.name} (from project name)`}
        />
        <DetailField label="Contractor" value={project.contractor.name} />
        <DetailField label="Client" value={project.client.name} />
        <DetailField
          label="Preferred Payment Method"
          value={project.preferredPaymentMethod?.label ?? "None"}
        />
        <DetailField
          label="Invoice Number Format"
          value={project.invoiceNumberFormat}
        />
        <DetailField label="Next Invoice Number" value={nextInvoiceNumber} />
        <DetailField
          label="Invoice Period"
          value={
            project.invoicePeriodType
              ? INVOICE_PERIOD_LABELS[project.invoicePeriodType]
              : "None"
          }
        />
        <DetailField
          label="Currency Mode"
          value={CURRENCY_MODE_LABELS[project.currencyMode]}
        />
        <DetailField
          label={
            project.currencyMode === "DUAL" ? "Display Currency" : "Currency"
          }
          value={CURRENCY_LABELS[project.displayCurrency]}
        />
        <DetailField label="Status" value={STATUS_LABELS[project.status]} />
      </CardContent>
    </Card>
  );
}

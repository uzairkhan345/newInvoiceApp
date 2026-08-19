import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { StatusActionBar } from "@/components/invoice/StatusActionBar";
import {
  InvoiceDetailTabs,
  type InvoiceDetailTab,
} from "@/components/invoice/InvoiceDetailTabs";
import { InvoiceOverdueBanner } from "@/components/invoice/InvoiceOverdueBanner";
import { InvoiceSummaryTab } from "@/components/invoice/InvoiceSummaryTab";
import { InvoicePreviewTab } from "@/components/invoice/InvoicePreviewTab";
import { InvoiceActivityTab } from "@/components/invoice/InvoiceActivityTab";
import { Eye, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { toDateInputValue, isOverdue } from "@/lib/dates";
import { buildInvoiceActivity } from "@/lib/invoiceActivity";
import { getAiAssistConfigSummary } from "@/lib/ai-providers/config";
import { resolveBackTarget } from "@/lib/backNavigation";

function resolveTab(value: string | undefined): InvoiceDetailTab {
  if (value === "preview" || value === "activity") return value;
  return "summary";
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; returnTo?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam, returnTo } = await searchParams;
  const back = resolveBackTarget(returnTo, {
    href: "/invoices",
    label: "Back to Invoices",
  });
  const invoice = await invoiceService.getById(id);
  if (!invoice) {
    notFound();
  }

  if (invoice.status !== "DRAFT") {
    const tab = resolveTab(tabParam);
    const data = documentService.assembleInvoiceDocumentData(invoice);
    const events = buildInvoiceActivity(invoice);
    const overdue = invoice.status === "SENT" && isOverdue(invoice.dueDate);

    return (
      <>
        <PageHeader
          title={invoice.invoiceNumber}
          subtitle={
            <>
              <Link
                href={`/parties/${invoice.project.client.id}`}
                className="hover:text-brand hover:underline"
              >
                {invoice.project.client.name}
              </Link>
              {" · "}
              <Link
                href={`/projects/${invoice.projectId}`}
                className="hover:text-brand hover:underline"
              >
                {invoice.project.name}
              </Link>
            </>
          }
          action={
            <div className="flex items-center gap-3">
              <StatusBadge status={invoice.status} dueDate={invoice.dueDate} />
              <StatusActionBar
                invoiceId={invoice.id}
                status={invoice.status}
                hasNoPaymentMethod={!invoice.project.preferredPaymentMethod}
              />
            </div>
          }
          backHref={back.href}
          backLabel={back.label}
        />
        {overdue ? <InvoiceOverdueBanner dueDate={invoice.dueDate} /> : null}
        <InvoiceDetailTabs
          invoiceId={invoice.id}
          active={tab}
          activityCount={events.length}
          returnTo={returnTo}
        />
        {tab === "summary" ? (
          <InvoiceSummaryTab invoice={invoice} data={data} />
        ) : tab === "preview" ? (
          <InvoicePreviewTab invoiceId={invoice.id} data={data} />
        ) : (
          <InvoiceActivityTab
            invoiceNumber={invoice.invoiceNumber}
            events={events}
          />
        )}
      </>
    );
  }

  const aiConfig = await getAiAssistConfigSummary();
  const headerAction = (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status={invoice.status} dueDate={invoice.dueDate} />
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/invoices/${invoice.id}/print`} target="_blank" />}
      >
        <Eye className="h-3.5 w-3.5" />
        Preview
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={
          <Link href={`/api/invoices/${invoice.id}/excel`} target="_blank" />
        }
      >
        <Download className="h-3.5 w-3.5" />
        Excel
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={
          <Link href={`/api/invoices/${invoice.id}/pdf`} target="_blank" />
        }
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </Button>
      <StatusActionBar
        invoiceId={invoice.id}
        status={invoice.status}
        hasNoPaymentMethod={!invoice.project.preferredPaymentMethod}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={
          <>
            Draft invoice for{" "}
            <Link
              href={`/projects/${invoice.projectId}`}
              className="hover:text-brand hover:underline"
            >
              {invoice.project.name}
            </Link>
            .
          </>
        }
        action={headerAction}
        backHref={back.href}
        backLabel={back.label}
      />
      <InvoiceForm
        mode="edit"
        invoiceId={invoice.id}
        projectId={invoice.projectId}
        aiConfig={aiConfig}
        project={{
          name: invoice.project.name,
          contractorName: invoice.project.contractor.name,
          clientName: invoice.project.client.name,
          preferredPaymentMethodLabel:
            invoice.project.preferredPaymentMethod?.label ?? null,
          displayCurrency: invoice.project.displayCurrency,
          currencyMode: invoice.project.currencyMode,
          currency: invoiceService.resolveInvoiceCurrency(invoice.project),
          invoiceNumberFormat: invoice.project.invoiceNumberFormat,
          invoicePeriodType: invoice.project.invoicePeriodType,
          referralCreditEnabled: invoice.project.referralCreditEnabled,
          referralCreditDefaultLabel:
            invoice.project.referralCreditLabel ??
            "Referral Credit (Thank you!)",
        }}
        defaultValues={{
          invoiceNumber: invoice.invoiceNumber,
          issueDate: toDateInputValue(invoice.issueDate),
          dueDate: toDateInputValue(invoice.dueDate),
          periodStart: invoice.periodStart
            ? toDateInputValue(invoice.periodStart)
            : "",
          periodEnd: invoice.periodEnd
            ? toDateInputValue(invoice.periodEnd)
            : "",
          convertedTotal: invoice.convertedTotal?.toString() ?? "",
          itemsNote: invoice.itemsNote ?? "",
          bottomNote: invoice.bottomNote ?? "",
          items: invoice.items.map((item) => ({
            description: item.description,
            isFlatAmount: item.isFlatAmount,
            isReferralCredit: item.isReferralCredit,
            quantity: item.quantity?.toString() ?? "",
            unitPrice: item.unitPrice?.toString() ?? "",
            // M35 — the field holds a positive magnitude; the stored amount
            // is negative for a referral-credit row, so it's un-negated here.
            amount: item.isReferralCredit
              ? item.amount.abs().toString()
              : item.isFlatAmount
                ? item.amount.toString()
                : "",
          })),
        }}
      />
    </>
  );
}

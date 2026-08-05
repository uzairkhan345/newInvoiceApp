import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { projectService } from "@/services/projectService";
import { invoiceService } from "@/services/invoiceService";
import { toDateInputValue } from "@/lib/dates";
import { computeDueDate } from "@/lib/invoicePeriod";
import { getAiAssistConfigSummary } from "@/lib/ai-providers/config";

export default async function NewInvoiceForProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await projectService.getById(projectId);
  if (!project) {
    notFound();
  }

  const suggestedInvoiceNumber =
    await invoiceService.previewNextInvoiceNumber(projectId);
  const today = toDateInputValue(new Date());
  const initialDueDate = project.invoicePeriodType
    ? computeDueDate(today, project.invoicePeriodType)
    : today;
  const aiConfig = await getAiAssistConfigSummary();
  const autofillData =
    await invoiceService.getAutofillDataForProject(projectId);

  return (
    <>
      <PageHeader
        backHref="/invoices/new"
        backLabel="Change project"
        eyebrow="New draft invoice"
        title="Create invoice"
        subtitle={`For ${project.name} · ${project.client.name}`}
      />
      <InvoiceForm
        mode="create"
        projectId={project.id}
        aiConfig={aiConfig}
        autofillData={autofillData}
        project={{
          name: project.name,
          contractorName: project.contractor.name,
          clientName: project.client.name,
          preferredPaymentMethodLabel:
            project.preferredPaymentMethod?.label ?? null,
          displayCurrency: project.displayCurrency,
          currencyMode: project.currencyMode,
          currency: invoiceService.resolveInvoiceCurrency(project),
          invoiceNumberFormat: project.invoiceNumberFormat,
          invoicePeriodType: project.invoicePeriodType,
        }}
        defaultValues={{
          invoiceNumber: suggestedInvoiceNumber,
          issueDate: today,
          dueDate: initialDueDate,
        }}
      />
    </>
  );
}

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { projectService } from "@/services/projectService";
import { invoiceService } from "@/services/invoiceService";
import { toDateInputValue } from "@/lib/dates";
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
  const aiConfig = await getAiAssistConfigSummary();

  return (
    <>
      <PageHeader
        title="Create Invoice"
        subtitle={`New draft invoice for ${project.name}.`}
      />
      <InvoiceForm
        mode="create"
        projectId={project.id}
        aiConfig={aiConfig}
        project={{
          name: project.name,
          contractorName: project.contractor.name,
          clientName: project.client.name,
          preferredPaymentMethodLabel:
            project.preferredPaymentMethod?.label ?? null,
          displayCurrency: project.displayCurrency,
        }}
        defaultValues={{
          invoiceNumber: suggestedInvoiceNumber,
          issueDate: today,
          dueDate: today,
        }}
      />
    </>
  );
}

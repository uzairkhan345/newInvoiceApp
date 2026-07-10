import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectForm } from "@/components/project/ProjectForm";
import { ProjectDeleteButton } from "@/components/project/ProjectDeleteButton";
import { projectService } from "@/services/projectService";
import { partyService } from "@/services/partyService";
import { paymentMethodService } from "@/services/paymentMethodService";
import type { PaymentMethod } from "@/generated/prisma/client";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await projectService.getById(id);
  if (!project) {
    notFound();
  }

  const [isDeletable, parties] = await Promise.all([
    projectService.isDeletable(id),
    partyService.list(),
  ]);
  const paymentMethodEntries = await Promise.all(
    parties.map(
      async (party) =>
        [party.id, await paymentMethodService.listForParty(party.id)] as const,
    ),
  );
  const paymentMethodsByPartyId: Record<string, PaymentMethod[]> =
    Object.fromEntries(paymentMethodEntries);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle="Edit project details and invoicing configuration."
        backHref="/projects"
        backLabel="Back to Projects"
        action={
          <ProjectDeleteButton
            projectId={project.id}
            projectName={project.name}
            isDeletable={isDeletable}
          />
        }
      />
      <ProjectForm
        mode="edit"
        projectId={project.id}
        initialParties={parties}
        initialPaymentMethodsByPartyId={paymentMethodsByPartyId}
        defaultValues={{
          name: project.name,
          abbreviation: project.abbreviation ?? "",
          clientId: project.clientId,
          contractorId: project.contractorId,
          preferredPaymentMethodId: project.preferredPaymentMethodId ?? "",
          invoiceNumberFormat: project.invoiceNumberFormat,
          displayCurrency: project.displayCurrency,
          status: project.status,
        }}
      />
    </>
  );
}

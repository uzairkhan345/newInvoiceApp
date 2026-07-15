import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectForm } from "@/components/project/ProjectForm";
import { ProjectDetailCard } from "@/components/project/ProjectDetailCard";
import { ProjectDeleteButton } from "@/components/project/ProjectDeleteButton";
import { Button } from "@/components/ui/button";
import { projectService } from "@/services/projectService";
import { partyService } from "@/services/partyService";
import { paymentMethodService } from "@/services/paymentMethodService";
import type { PaymentMethod } from "@/generated/prisma/client";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const isEditing = edit === "1";

  const project = await projectService.getById(id);
  if (!project) {
    notFound();
  }

  if (isEditing) {
    const parties = await partyService.list();
    const paymentMethodEntries = await Promise.all(
      parties.map(
        async (party) =>
          [
            party.id,
            await paymentMethodService.listForParty(party.id),
          ] as const,
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
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/projects/${project.id}`} />}
            >
              Cancel
            </Button>
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

  const isDeletable = await projectService.isDeletable(id);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle="View project details and invoicing configuration."
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
      <ProjectDetailCard
        project={project}
        editHref={`/projects/${project.id}?edit=1`}
      />
    </>
  );
}

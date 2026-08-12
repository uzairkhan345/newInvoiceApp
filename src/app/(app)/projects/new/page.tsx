import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectForm } from "@/components/project/ProjectForm";
import { partyService } from "@/services/partyService";
import { paymentMethodService } from "@/services/paymentMethodService";
import type { PaymentMethod } from "@/generated/prisma/client";

export default async function NewProjectPage() {
  const parties = await partyService.list();
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
        title="Create Project"
        subtitle="Link a contractor and a client so invoices can be generated under this project."
      />
      <ProjectForm
        mode="create"
        initialParties={parties}
        initialPaymentMethodsByPartyId={paymentMethodsByPartyId}
      />
    </>
  );
}

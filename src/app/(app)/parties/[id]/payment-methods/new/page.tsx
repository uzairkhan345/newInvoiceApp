import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentMethodForm } from "@/components/payment-method/PaymentMethodForm";
import { partyService } from "@/services/partyService";
import { getAiAssistConfigSummary } from "@/lib/ai-providers/config";

export default async function NewPaymentMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const party = await partyService.getById(id);
  if (!party) {
    notFound();
  }
  const aiConfig = await getAiAssistConfigSummary();

  return (
    <>
      <PageHeader title="Add Payment Method" subtitle={`For ${party.name}.`} />
      <PaymentMethodForm mode="create" partyId={party.id} aiConfig={aiConfig} />
    </>
  );
}

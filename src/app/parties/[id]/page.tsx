import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { PartyForm } from "@/components/party/PartyForm";
import { PartyDeleteButton } from "@/components/party/PartyDeleteButton";
import { partyService } from "@/services/partyService";

export default async function PartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const party = await partyService.getById(id);
  if (!party) {
    notFound();
  }

  const isDeletable = await partyService.isDeletable(id);

  return (
    <>
      <PageHeader
        title={party.name}
        subtitle="Edit party details and address."
        action={
          <PartyDeleteButton
            partyId={party.id}
            partyName={party.name}
            isDeletable={isDeletable}
          />
        }
      />
      <PartyForm
        mode="edit"
        partyId={party.id}
        defaultValues={{
          name: party.name,
          email: party.email ?? "",
          type: party.type,
          street1: party.street1 ?? "",
          street2: party.street2 ?? "",
          city: party.city ?? "",
          state: party.state ?? "",
          postalCode: party.postalCode ?? "",
          country: party.country ?? "",
        }}
      />
    </>
  );
}

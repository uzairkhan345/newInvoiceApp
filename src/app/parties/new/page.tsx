import { PageHeader } from "@/components/layout/PageHeader";
import { PartyForm } from "@/components/party/PartyForm";

export default function NewPartyPage() {
  return (
    <>
      <PageHeader
        title="Create Party"
        subtitle="Parties can be used as a contractor, a client, or both on any project."
      />
      <PartyForm mode="create" />
    </>
  );
}

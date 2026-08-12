import { PageHeader } from "@/components/layout/PageHeader";
import { PartyForm } from "@/components/party/PartyForm";
import { getAiAssistConfigSummary } from "@/lib/ai-providers/config";

export default async function NewPartyPage() {
  const aiConfig = await getAiAssistConfigSummary();
  return (
    <>
      <PageHeader
        title="Create Party"
        subtitle="Parties can be used as a contractor, a client, or both on any project."
      />
      <PartyForm mode="create" aiConfig={aiConfig} />
    </>
  );
}

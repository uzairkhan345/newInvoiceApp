import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { PartyTable } from "@/components/party/PartyTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { partyService } from "@/services/partyService";

export default async function PartiesPage() {
  const parties = await partyService.list();

  return (
    <>
      <PageHeader
        title="Parties"
        subtitle="Every contractor and client in one unified roster."
        action={
          <Button nativeButton={false} render={<Link href="/parties/new" />}>
            Create Party
          </Button>
        }
      />
      {parties.length === 0 ? (
        <EmptyState
          title="No parties yet"
          description="Create your first party to use it as a contractor or client on a project."
          action={
            <Button nativeButton={false} render={<Link href="/parties/new" />}>
              Create your first party
            </Button>
          }
        />
      ) : (
        <PartyTable parties={parties} />
      )}
    </>
  );
}

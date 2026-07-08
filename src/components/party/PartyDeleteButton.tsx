"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { deletePartyAction } from "@/actions/party.actions";

export function PartyDeleteButton({
  partyId,
  partyName,
  isDeletable,
}: {
  partyId: string;
  partyName: string;
  isDeletable: boolean;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      triggerLabel="Delete Party"
      triggerVariant="destructive"
      disabled={!isDeletable}
      disabledReason="This party is still assigned to a project as its contractor or client. Remove it from the project first."
      title={`Delete ${partyName}?`}
      description="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={async () => {
        const result = await deletePartyAction(partyId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Party deleted");
        router.push("/parties");
        router.refresh();
      }}
    />
  );
}

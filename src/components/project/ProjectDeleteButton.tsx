"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { deleteProjectAction } from "@/actions/project.actions";

export function ProjectDeleteButton({
  projectId,
  projectName,
  isDeletable,
}: {
  projectId: string;
  projectName: string;
  isDeletable: boolean;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      triggerLabel="Delete Project"
      triggerVariant="destructive"
      disabled={!isDeletable}
      disabledReason="This project still has invoices attached to it. Delete its invoices first."
      title={`Delete ${projectName}?`}
      description="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={async () => {
        const result = await deleteProjectAction(projectId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Project deleted");
        router.push("/projects");
        router.refresh();
      }}
    />
  );
}

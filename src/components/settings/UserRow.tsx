"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { updateUserRoleAction, deleteUserAction } from "@/actions/user.actions";
import { ROLE_LABELS } from "@/components/settings/roleLabels";
import type { User, Role } from "@/generated/prisma/client";

/**
 * M28 — role changes are inline (this row IS the "edit" form, one field),
 * no separate edit dialog. `isSelf`/`isOnlyAdmin` only soften the copy
 * shown on failure — the real guard is `userService`'s last-admin check,
 * enforced server-side regardless of what this component knows.
 */
export function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const router = useRouter();
  const [isChangingRole, setIsChangingRole] = useState(false);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[13px] font-bold text-foreground">
              {user.name || user.email}
            </span>
            {isSelf ? (
              <Badge variant="outline" className="uppercase">
                You
              </Badge>
            ) : null}
          </div>
          {user.name ? (
            <span className="truncate text-[12px] text-muted-foreground">
              {user.email}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={user.role}
            disabled={isChangingRole}
            onValueChange={async (role) => {
              setIsChangingRole(true);
              try {
                const result = await updateUserRoleAction(
                  user.id,
                  role as Role,
                );
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                router.refresh();
              } finally {
                setIsChangingRole(false);
              }
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-[12px]">
              <SelectValue
                renderValue={(value) => ROLE_LABELS[value as Role]}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RESTRICTED">
                {ROLE_LABELS.RESTRICTED}
              </SelectItem>
              <SelectItem value="STANDARD">{ROLE_LABELS.STANDARD}</SelectItem>
              <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
            </SelectContent>
          </Select>
          <ConfirmDialog
            triggerLabel="Remove"
            triggerVariant="destructive"
            title={`Remove ${user.email}?`}
            description="They immediately lose access — any active session is revoked, not just future sign-ins."
            confirmLabel="Remove"
            onConfirm={async () => {
              const result = await deleteUserAction(user.id);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              toast.success("User removed");
              router.refresh();
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

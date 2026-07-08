"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Generic delete/status-transition confirmation (Docs/execution_plan.md §7).
 * When `disabled`, renders a plain disabled button with a native title
 * tooltip instead of a dialog trigger — satisfies the "delete button
 * (disabled + tooltip if blocked)" pattern in one place.
 */
export function ConfirmDialog({
  triggerLabel,
  triggerVariant = "outline",
  disabled = false,
  disabledReason,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
}: {
  triggerLabel: ReactNode;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
  disabledReason?: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  if (disabled) {
    return (
      <Button
        variant={triggerVariant}
        disabled
        title={disabledReason}
        aria-disabled
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={async () => {
              setIsPending(true);
              try {
                await onConfirm();
              } finally {
                setIsPending(false);
                setOpen(false);
              }
            }}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

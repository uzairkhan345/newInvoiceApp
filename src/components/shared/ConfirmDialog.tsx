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
 * Generic delete/status-transition confirmation.
 * When `disabled`, renders a plain disabled button with a native title
 * tooltip instead of a dialog trigger — satisfies the "delete button
 * (disabled + tooltip if blocked)" pattern in one place.
 *
 * `open`/`onOpenChange` make it a controlled component when the caller needs
 * to open it from somewhere other than its own trigger button (e.g. a
 * dropdown menu item, which can't safely nest a Dialog trigger inside a
 * Menu's own item without the two overlay systems fighting over focus/close
 * timing) — pass `hideTrigger` alongside them to skip rendering the trigger
 * altogether. Uncontrolled (no `open` passed) preserves the original
 * self-contained behavior every existing caller relies on.
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
  open: openProp,
  onOpenChange: onOpenChangeProp,
  hideTrigger = false,
}: {
  triggerLabel?: ReactNode;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
  disabledReason?: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChangeProp ?? setUncontrolledOpen;
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
      {hideTrigger ? null : (
        <DialogTrigger render={<Button variant={triggerVariant} />}>
          {triggerLabel}
        </DialogTrigger>
      )}
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

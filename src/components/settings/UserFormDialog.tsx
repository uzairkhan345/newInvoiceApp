"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/settings/UserForm";
import { useState } from "react";

/** M28 — no self-registration, so this is the only way (besides
 * `scripts/bootstrapAdmin.ts`) a new person ever gets in. */
export function UserFormDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Add User</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            They&apos;ll be able to sign in with this email via Google — no
            password to set.
          </DialogDescription>
        </DialogHeader>
        {open ? <UserForm onSaved={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

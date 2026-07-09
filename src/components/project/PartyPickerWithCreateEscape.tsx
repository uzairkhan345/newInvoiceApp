"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { partySchema, type PartyInput } from "@/lib/validation/party";
import { createPartyAction } from "@/actions/party.actions";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Party } from "@/generated/prisma/client";

const emptyPartyDefaults: PartyInput = {
  name: "",
  email: "",
  type: "ORGANIZATION",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

/** Builds a Party-shaped object from validated input + a freshly-issued id, mirroring partyService's null-normalization, so the picker can add it to its options without a round-trip refetch. */
function toLocalParty(id: string, input: PartyInput): Party {
  const nullIfEmpty = (value: string | undefined) =>
    value && value.length > 0 ? value : null;

  return {
    id,
    name: input.name,
    email: nullIfEmpty(input.email),
    type: input.type,
    street1: nullIfEmpty(input.street1),
    street2: nullIfEmpty(input.street2),
    city: nullIfEmpty(input.city),
    state: nullIfEmpty(input.state),
    postalCode: nullIfEmpty(input.postalCode),
    country: nullIfEmpty(input.country),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Docs/product_spec.md Workflow 3 / Docs/implementation_decisions.md §20 —
 * standing "select the prerequisite first, with an inline create-new escape
 * hatch" pattern. Creating a party here never navigates away from the
 * project form and never loses its in-progress field values.
 */
function MiniCreatePartyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (party: Party) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartyInput>({
    resolver: zodResolver(partySchema),
    defaultValues: emptyPartyDefaults,
  });

  useEffect(() => {
    if (open) {
      reset(emptyPartyDefaults);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const result = await createPartyAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Party created");
      onCreated(toLocalParty(result.data.id, values));
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Party</DialogTitle>
          <DialogDescription>
            Add the minimum details now — the full profile (address, etc.) can
            be filled in later from the Parties page.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FormField
            label="Name"
            htmlFor="mini-party-name"
            required
            error={errors.name?.message}
          >
            <Input id="mini-party-name" {...register("name")} />
          </FormField>
          <FormField
            label="Email"
            htmlFor="mini-party-email"
            error={errors.email?.message}
          >
            <Input id="mini-party-email" type="email" {...register("email")} />
          </FormField>
          <FormField
            label="Type"
            htmlFor="mini-party-type"
            required
            error={errors.type?.message}
          >
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="mini-party-type" className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="ORGANIZATION">Organization</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Party"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PartyPickerWithCreateEscape({
  label,
  parties,
  value,
  onChange,
  onPartyCreated,
  error,
  placeholder = "Select a party",
}: {
  label: string;
  parties: Party[];
  value: string;
  onChange: (partyId: string) => void;
  onPartyCreated: (party: Party) => void;
  error?: string;
  placeholder?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
          {label}
          <span className="ml-0.5 text-destructive">*</span>
        </span>
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-3 w-3" />
          Create new party
        </button>
      </div>
      <Select
        value={value}
        onValueChange={(newValue) => onChange(newValue ?? "")}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {parties.map((party) => (
            <SelectItem key={party.id} value={party.id}>
              {party.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}

      <MiniCreatePartyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(party) => {
          onPartyCreated(party);
          onChange(party.id);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

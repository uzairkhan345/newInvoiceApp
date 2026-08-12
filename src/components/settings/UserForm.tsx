"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { userSchema, type UserInput } from "@/lib/validation/user";
import { createUserAction } from "@/actions/user.actions";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/components/settings/roleLabels";

/**
 * M28 — create-only (no self-registration exists, so this is the entire
 * "add a person" flow). Role changes for an existing user happen inline on
 * their row (`UserRow.tsx`), not by reopening this form.
 */
export function UserForm({ onSaved }: { onSaved: () => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", role: "RESTRICTED" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const result = await createUserAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("User added");
      onSaved();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormField
        label="Email"
        htmlFor="email"
        required
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          {...register("email")}
        />
      </FormField>

      <FormField
        label="Role"
        htmlFor="role"
        required
        error={errors.role?.message}
      >
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue
                  renderValue={(value) =>
                    ROLE_LABELS[value as UserInput["role"]]
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RESTRICTED">
                  {ROLE_LABELS.RESTRICTED}
                </SelectItem>
                <SelectItem value="STANDARD">
                  {ROLE_LABELS.STANDARD}
                </SelectItem>
                <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Adding…" : "Add User"}
      </Button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from "lucide-react";
import {
  aiProviderSettingSchema,
  type AiProviderSettingInput,
} from "@/lib/validation/aiProviderSettings";
import {
  updateProviderSettingAction,
  moveProviderAction,
} from "@/actions/aiProviderSettings.actions";
import type { ProviderSettingDisplay } from "@/services/aiProviderSettingsService";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";

export const PROVIDER_LABELS: Record<
  ProviderSettingDisplay["provider"],
  string
> = {
  google: "Google (Gemini)",
  anthropic: "Anthropic (Claude)",
  groq: "Groq",
};

/**
 * M16 — one card per fixed provider. `apiKey`
 * always starts blank (write-only, see aiProviderSettingsService) — leaving
 * it blank on submit keeps whatever key is already saved; `maskedKeyHint`
 * is the only trace of the real value that ever reaches the client.
 */
export function ProviderSettingsCard({
  setting,
  isFirst,
  isLast,
}: {
  setting: ProviderSettingDisplay;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMoving, startMoveTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AiProviderSettingInput>({
    resolver: zodResolver(aiProviderSettingSchema),
    defaultValues: {
      apiKey: "",
      models: setting.models.map((value) => ({ value })),
      enabled: setting.enabled,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "models",
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const result = await updateProviderSettingAction(
        setting.provider,
        values,
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${PROVIDER_LABELS[setting.provider]} settings saved`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  });

  function handleMove(direction: "up" | "down") {
    startMoveTransition(async () => {
      await moveProviderAction(setting.provider, direction);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px] font-bold text-foreground">
          {PROVIDER_LABELS[setting.provider]}
          {isFirst ? <Badge variant="secondary">Default</Badge> : null}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 p-0"
              disabled={isFirst || isMoving}
              onClick={() => handleMove("up")}
              aria-label={`Move ${PROVIDER_LABELS[setting.provider]} up`}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 p-0"
              disabled={isLast || isMoving}
              onClick={() => handleMove("down")}
              aria-label={`Move ${PROVIDER_LABELS[setting.provider]} down`}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FormField
            label="API Key"
            htmlFor={`${setting.provider}-apiKey`}
            error={errors.apiKey?.message}
          >
            <Input
              id={`${setting.provider}-apiKey`}
              type="password"
              autoComplete="off"
              placeholder={
                setting.maskedKeyHint
                  ? `${setting.maskedKeyHint} — leave blank to keep`
                  : "Not set"
              }
              {...register("apiKey")}
            />
          </FormField>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
              Models (tried in order)
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => append({ value: "" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Model
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="mb-3 text-[12px] text-muted-foreground">
              No models configured — this provider is skipped at runtime.
            </p>
          ) : null}

          <div className="mb-4 flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-1.5">
                <Input
                  placeholder="e.g. gemini-2.5-flash"
                  {...register(`models.${index}.value` as const)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 p-0"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label="Move model up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 p-0"
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label="Move model down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 p-0 text-destructive"
                  onClick={() => remove(index)}
                  aria-label="Remove model"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {errors.models?.root?.message ? (
              <p className="text-[11px] text-destructive">
                {errors.models.root.message}
              </p>
            ) : null}
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Controller
              name="enabled"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id={`${setting.provider}-enabled`}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
            <label
              htmlFor={`${setting.provider}-enabled`}
              className="text-[13px] font-medium text-foreground"
            >
              Enabled
            </label>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AiAssistConfigSummary } from "@/lib/ai-providers/config";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google (Gemini)",
  anthropic: "Anthropic (Claude)",
  groq: "Groq",
};

/**
 * Story 11.4 / Docs/implementation_decisions.md §22 — read-only summary of
 * the env-derived provider/model/fallback configuration. There is no in-app
 * mutation anywhere in this component; changing it means editing env vars
 * and restarting the app.
 */
export function ConfigureSummary({
  aiConfig,
}: {
  aiConfig: AiAssistConfigSummary;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Configure AI Assist"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Assist Configuration</DialogTitle>
            <DialogDescription>
              Read-only — sourced from environment variables. Change provider,
              model, or the fallback sequence by editing{" "}
              <code className="font-mono">.env.local</code> and restarting the
              app, not from here.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-[13px]">
            <div>
              <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
                Primary
              </p>
              <p className="text-foreground">
                {aiConfig.primary
                  ? `${PROVIDER_LABELS[aiConfig.primary.provider] ?? aiConfig.primary.provider} — ${aiConfig.primary.model}`
                  : "Not configured"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
                Fallback Sequence
              </p>
              {aiConfig.fallback.length > 0 ? (
                <ol className="list-inside list-decimal text-foreground">
                  {aiConfig.fallback.map((target, index) => (
                    <li key={index}>
                      {PROVIDER_LABELS[target.provider] ?? target.provider} —{" "}
                      {target.model}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground">None configured</p>
              )}
            </div>
            {!aiConfig.configured ? (
              <p className="text-muted-foreground">
                Set <code className="font-mono">AI_PRIMARY_PROVIDER</code>,{" "}
                <code className="font-mono">AI_PRIMARY_MODEL</code>, and the
                matching <code className="font-mono">*_API_KEY</code> (see{" "}
                <code className="font-mono">.env.local.example</code>) to enable
                AI Assist. The form works fully by hand either way.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

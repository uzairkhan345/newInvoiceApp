"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  ChatMessage,
  type AiChatMessage,
} from "@/components/ai-assist/ChatMessage";
import { ConfigureSummary } from "@/components/ai-assist/ConfigureSummary";
import {
  runAiAssistAction,
  runInvoiceAiAssistAction,
} from "@/actions/aiAssist.actions";
import type { AiFormType, InvoiceAiContext } from "@/services/aiAssistService";
import type { AiAssistConfigSummary } from "@/lib/ai-providers/config";

/** Docs/feedback_backlog.md M18 — after this many clarifying questions with no resolved suggestion, stop looping and hand back to the user. */
const MAX_CLARIFICATION_ROUNDS = 2;

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

const FORM_LABEL: Record<AiFormType, string> = {
  party: "party",
  paymentMethod: "payment method",
  invoice: "invoice",
};

const PLACEHOLDER: Record<AiFormType, string> = {
  party:
    'e.g. "Acme Robotics, an organization, billing email ap@acme.com, based in Austin TX"',
  paymentMethod:
    'e.g. "Default bank wire, routing 021000021, account 4400123456"',
  invoice:
    'e.g. "3 days of consulting at $150/hr, issued today, due in 15 days"',
};

/** Builds the transcript text sent as the next `promptText` when continuing a pending clarification round. */
function appendToTranscript(transcript: string, line: string): string {
  return `${transcript}\n${line}`;
}

/**
 * Docs/ui_design_guide.md §14 — chat-style panel alongside the Party,
 * Payment Method, and Invoice forms (create AND edit — grilled/confirmed
 * 2026-07-15, see Docs/execution_plan.md §16 M11), never Project. Pure
 * progressive enhancement: `onApply` only ever stages field values into the
 * caller's already-open react-hook-form instance — this component never
 * submits anything itself.
 *
 * Invoice-only, Docs/feedback_backlog.md M18: `getContext` (when provided)
 * enables project + current-form-value context and a two-round clarifying-
 * question loop, via `runInvoiceAiAssistAction` instead of the plain
 * single-shot `runAiAssistAction` party/paymentMethod still use unchanged.
 */
export function AIAssistPanel({
  formType,
  aiConfig,
  onApply,
  getContext,
}: {
  formType: AiFormType;
  aiConfig: AiAssistConfigSummary;
  onApply: (suggestion: Record<string, unknown>) => void;
  getContext?: () => InvoiceAiContext;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [promptText, setPromptText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [clarification, setClarification] = useState<{
    transcript: string;
    count: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (!aiConfig.configured) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-[13px] font-bold text-muted-foreground">
            AI Assist
          </CardTitle>
          <CardAction>
            <ConfigureSummary />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-[12px] text-muted-foreground">
            Not configured — this form works fully by hand. Open Configure for
            the env vars that enable it.
          </p>
        </CardContent>
      </Card>
    );
  }

  function handleSendSingleShot(
    prompt: string,
    kind: "party" | "paymentMethod",
  ) {
    startTransition(async () => {
      const result = await runAiAssistAction(kind, prompt);
      if (!result.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: result.error, isError: true },
        ]);
        return;
      }
      onApply(result.data);
      const appliedFields = Object.keys(result.data)
        .map(humanizeKey)
        .join(", ");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Applied: ${appliedFields}. Review before saving.`,
        },
      ]);
    });
  }

  function handleSendInvoice(prompt: string) {
    const isReply = clarification !== null;
    const promptForModel = isReply
      ? appendToTranscript(clarification!.transcript, `User: ${prompt}`)
      : prompt;

    startTransition(async () => {
      const result = await runInvoiceAiAssistAction(
        promptForModel,
        getContext!(),
      );

      if (!result.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: result.error, isError: true },
        ]);
        setClarification(null);
        return;
      }

      const { data } = result;
      if (data.responseType === "clarification") {
        const question = data.question;
        const nextCount = (clarification?.count ?? 0) + 1;
        if (nextCount > MAX_CLARIFICATION_ROUNDS) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: "I still can't pin that down confidently — please fill in the rest by hand.",
              isError: true,
            },
          ]);
          setClarification(null);
          return;
        }
        setMessages((prev) => [...prev, { role: "assistant", text: question }]);
        setClarification({
          transcript: appendToTranscript(
            promptForModel,
            `Assistant: ${question}`,
          ),
          count: nextCount,
        });
        return;
      }

      onApply(data.suggestion);
      const appliedFields = Object.keys(data.suggestion)
        .map(humanizeKey)
        .join(", ");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Applied: ${appliedFields}. Review before saving.`,
        },
      ]);
      setClarification(null);
    });
  }

  function handleSend() {
    const prompt = promptText.trim();
    if (!prompt || isPending) return;
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setPromptText("");

    if (formType === "invoice") {
      handleSendInvoice(prompt);
    } else {
      handleSendSingleShot(prompt, formType);
    }
  }

  return (
    <Card className="flex h-fit flex-col">
      <CardHeader>
        <CardTitle className="text-[13px] font-bold text-foreground">
          AI Assist
        </CardTitle>
        <CardAction>
          <ConfigureSummary />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          ref={scrollRef}
          className="flex max-h-64 min-h-16 flex-col gap-2 overflow-y-auto"
        >
          {messages.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Describe this {FORM_LABEL[formType]} and I&apos;ll fill in what I
              can — you still review and submit manually.
            </p>
          ) : (
            messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Textarea
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            placeholder={clarification ? "Your answer…" : PLACEHOLDER[formType]}
            rows={3}
            className="text-[13px]"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={isPending || !promptText.trim()}
            onClick={handleSend}
            className="self-end"
          >
            <Send className="h-3.5 w-3.5" />
            {isPending ? "Thinking…" : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

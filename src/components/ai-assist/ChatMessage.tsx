import { cn } from "@/lib/utils";

export type AiChatMessage = {
  role: "user" | "assistant";
  text: string;
  /** Assistant messages reporting a failure render lower-emphasis, never as an alert. */
  isError?: boolean;
};

export function ChatMessage({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-[12px] leading-snug whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : message.isError
              ? "bg-muted text-muted-foreground"
              : "bg-brand-light text-foreground",
        )}
      >
        {message.text}
      </p>
    </div>
  );
}

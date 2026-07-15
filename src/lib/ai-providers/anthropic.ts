import type { AiProviderCaller } from "@/lib/ai-providers/types";

/** Plain REST call to the Messages API — no @anthropic-ai/sdk dependency. */
export const callAnthropic: AiProviderCaller = async ({
  model,
  apiKey,
  systemPrompt,
  userPrompt,
}) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Anthropic provider error ${response.status}: ${await response.text()}`,
    );
  }

  const data = await response.json();
  const text = data?.content?.find(
    (block: { type?: string; text?: string }) => block.type === "text",
  )?.text;
  if (typeof text !== "string") {
    throw new Error("Anthropic provider returned no text content");
  }
  return text;
};

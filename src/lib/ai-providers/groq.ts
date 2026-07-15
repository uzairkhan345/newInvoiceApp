import type { AiProviderCaller } from "@/lib/ai-providers/types";

/** Plain REST call to Groq's OpenAI-compatible chat completions endpoint. */
export const callGroq: AiProviderCaller = async ({
  model,
  apiKey,
  systemPrompt,
  userPrompt,
}) => {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Groq provider error ${response.status}: ${await response.text()}`,
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Groq provider returned no text content");
  }
  return text;
};

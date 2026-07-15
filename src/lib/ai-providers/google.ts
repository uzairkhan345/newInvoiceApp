import type { AiProviderCaller } from "@/lib/ai-providers/types";

/** Plain REST call to the Gemini API — no @google/generative-ai SDK dependency. */
export const callGoogle: AiProviderCaller = async ({
  model,
  apiKey,
  systemPrompt,
  userPrompt,
}) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Google provider error ${response.status}: ${await response.text()}`,
    );
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Google provider returned no text content");
  }
  return text;
};

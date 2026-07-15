import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { resolveAiAssistSequence, getAiAssistConfigSummary } from "@/lib/ai-providers/config";
import { runWithFallback } from "@/lib/ai-providers/fallbackRunner";

const schema = z.object({ name: z.string().optional() });

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveAiAssistSequence / getAiAssistConfigSummary", () => {
  it("is empty and reports unconfigured when no env vars are set", () => {
    vi.stubEnv("AI_PRIMARY_PROVIDER", "");
    vi.stubEnv("AI_PRIMARY_MODEL", "");
    vi.stubEnv("AI_FALLBACK_SEQUENCE", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");

    expect(resolveAiAssistSequence()).toEqual([]);
    expect(getAiAssistConfigSummary()).toEqual({
      configured: false,
      primary: null,
      fallback: [],
    });
  });

  it("drops a primary target whose API key is missing, falling through to a configured fallback", () => {
    vi.stubEnv("AI_PRIMARY_PROVIDER", "google");
    vi.stubEnv("AI_PRIMARY_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GOOGLE_API_KEY", ""); // no key -> primary unusable
    vi.stubEnv("AI_FALLBACK_SEQUENCE", "anthropic:claude-haiku-4-5");
    vi.stubEnv("ANTHROPIC_API_KEY", "ant-key");

    const sequence = resolveAiAssistSequence();
    expect(sequence).toEqual([
      { provider: "anthropic", model: "claude-haiku-4-5", apiKey: "ant-key" },
    ]);
    expect(getAiAssistConfigSummary().configured).toBe(true);
  });

  it("parses a full primary + multi-entry fallback sequence in order", () => {
    vi.stubEnv("AI_PRIMARY_PROVIDER", "google");
    vi.stubEnv("AI_PRIMARY_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GOOGLE_API_KEY", "g-key");
    vi.stubEnv(
      "AI_FALLBACK_SEQUENCE",
      "anthropic:claude-haiku-4-5, groq:llama-3.3-70b-versatile",
    );
    vi.stubEnv("ANTHROPIC_API_KEY", "a-key");
    vi.stubEnv("GROQ_API_KEY", "gr-key");

    expect(resolveAiAssistSequence().map((t) => t.provider)).toEqual([
      "google",
      "anthropic",
      "groq",
    ]);
  });
});

describe("runWithFallback", () => {
  it("returns null and never calls fetch when nothing is configured", async () => {
    vi.stubEnv("AI_PRIMARY_PROVIDER", "");
    vi.stubEnv("AI_PRIMARY_MODEL", "");
    vi.stubEnv("AI_FALLBACK_SEQUENCE", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithFallback({
      systemPrompt: "sys",
      userPrompt: "user",
      schema,
    });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the first provider's validated JSON on success", async () => {
    vi.stubEnv("AI_PRIMARY_PROVIDER", "google");
    vi.stubEnv("AI_PRIMARY_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GOOGLE_API_KEY", "g-key");
    vi.stubEnv("AI_FALLBACK_SEQUENCE", "");

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: '{"name":"Acme"}' }] } },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithFallback({
      systemPrompt: "sys",
      userPrompt: "user",
      schema,
    });

    expect(result).toEqual({ name: "Acme" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("strips markdown fences before parsing JSON", async () => {
    vi.stubEnv("AI_PRIMARY_PROVIDER", "google");
    vi.stubEnv("AI_PRIMARY_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GOOGLE_API_KEY", "g-key");
    vi.stubEnv("AI_FALLBACK_SEQUENCE", "");

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: '```json\n{"name":"Acme"}\n```' }],
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithFallback({
      systemPrompt: "sys",
      userPrompt: "user",
      schema,
    });

    expect(result).toEqual({ name: "Acme" });
  });

  it("falls through to the next provider when the primary errors, and again when a response fails schema validation", async () => {
    vi.stubEnv("AI_PRIMARY_PROVIDER", "google");
    vi.stubEnv("AI_PRIMARY_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GOOGLE_API_KEY", "g-key");
    vi.stubEnv(
      "AI_FALLBACK_SEQUENCE",
      "anthropic:claude-haiku-4-5,groq:llama-3.3-70b-versatile",
    );
    vi.stubEnv("ANTHROPIC_API_KEY", "a-key");
    vi.stubEnv("GROQ_API_KEY", "gr-key");

    const fetchMock = vi
      .fn()
      // google: network/HTTP failure
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
      // anthropic: valid JSON but fails schema (name must be a string)
      .mockResolvedValueOnce(
        jsonResponse({
          content: [{ type: "text", text: '{"name": 12345}' }],
        }),
      )
      // groq: succeeds
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [{ message: { content: '{"name":"Acme"}' } }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithFallback({
      systemPrompt: "sys",
      userPrompt: "user",
      schema,
    });

    expect(result).toEqual({ name: "Acme" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns null (never throws) when every provider fails", async () => {
    vi.stubEnv("AI_PRIMARY_PROVIDER", "google");
    vi.stubEnv("AI_PRIMARY_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GOOGLE_API_KEY", "g-key");
    vi.stubEnv("AI_FALLBACK_SEQUENCE", "");

    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithFallback({
      systemPrompt: "sys",
      userPrompt: "user",
      schema,
    });

    expect(result).toBeNull();
  });
});

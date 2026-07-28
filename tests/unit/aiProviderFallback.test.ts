import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ResolvedAiTarget } from "@/lib/ai-providers/config";

// M16 moved config from env vars to a DB-backed
// service — resolveAiAssistSequence() is now a thin async wrapper over
// aiProviderSettingsService (covered by its own DB-backed integration test,
// tests/integration/aiProviderSettingsService.test.ts). Here it's mocked
// directly so runWithFallback's walk/fetch/schema-validation logic is
// tested in isolation, same as before.
const resolveAiAssistSequence = vi.fn<() => Promise<ResolvedAiTarget[]>>();
vi.mock("@/lib/ai-providers/config", () => ({
  resolveAiAssistSequence: () => resolveAiAssistSequence(),
}));

const { runWithFallback } = await import("@/lib/ai-providers/fallbackRunner");

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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resolveAiAssistSequence.mockReset();
});

describe("runWithFallback", () => {
  it("returns null and never calls fetch when nothing is configured", async () => {
    resolveAiAssistSequence.mockResolvedValue([]);
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

  it("returns the first target's validated JSON on success", async () => {
    resolveAiAssistSequence.mockResolvedValue([
      { provider: "google", model: "gemini-2.5-flash", apiKey: "g-key" },
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: '{"name":"Acme"}' }] } }],
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
    resolveAiAssistSequence.mockResolvedValue([
      { provider: "google", model: "gemini-2.5-flash", apiKey: "g-key" },
    ]);

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

  it("recovers a raw JSON value even with trailing prose and no code fence (a real live-provider failure mode)", async () => {
    resolveAiAssistSequence.mockResolvedValue([
      { provider: "google", model: "gemini-2.5-flash", apiKey: "g-key" },
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"name":"Acme"}\nLet me know if you would like any changes!',
                },
              ],
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

  it("doesn't miscount JSON depth when a string value contains brace characters", async () => {
    resolveAiAssistSequence.mockResolvedValue([
      { provider: "google", model: "gemini-2.5-flash", apiKey: "g-key" },
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"name":"literally { not json }"}\ntrailing text',
                },
              ],
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

    expect(result).toEqual({ name: "literally { not json }" });
  });

  it("falls through to the next target when one errors, and again when a response fails schema validation — walking across providers just like within one", async () => {
    resolveAiAssistSequence.mockResolvedValue([
      { provider: "google", model: "gemini-2.5-flash", apiKey: "g-key" },
      { provider: "google", model: "gemini-2.5-pro", apiKey: "g-key" },
      { provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "gr-key" },
    ]);

    const fetchMock = vi
      .fn()
      // google:gemini-2.5-flash — network/HTTP failure
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
      // google:gemini-2.5-pro — valid JSON but fails schema (name must be a string)
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [{ content: { parts: [{ text: '{"name": 12345}' }] } }],
        }),
      )
      // groq — succeeds
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

  it("returns null (never throws) when every target fails", async () => {
    resolveAiAssistSequence.mockResolvedValue([
      { provider: "google", model: "gemini-2.5-flash", apiKey: "g-key" },
    ]);

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

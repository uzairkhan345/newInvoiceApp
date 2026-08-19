import { describe, expect, it } from "vitest";
import { isSafeReturnPath, resolveBackTarget } from "@/lib/backNavigation";

const FALLBACK = { href: "/invoices", label: "Back to Invoices" };

describe("isSafeReturnPath", () => {
  it("accepts a plain same-app relative path", () => {
    expect(isSafeReturnPath("/projects/abc123?tab=invoices")).toBe(true);
  });

  it("rejects an absolute URL (open-redirect guard)", () => {
    expect(isSafeReturnPath("https://evil.example.com")).toBe(false);
  });

  it("rejects a protocol-relative URL", () => {
    expect(isSafeReturnPath("//evil.example.com")).toBe(false);
  });

  it("rejects undefined/empty", () => {
    expect(isSafeReturnPath(undefined)).toBe(false);
    expect(isSafeReturnPath("")).toBe(false);
  });
});

describe("resolveBackTarget", () => {
  it("falls back when returnTo is unset", () => {
    expect(resolveBackTarget(undefined, FALLBACK)).toEqual(FALLBACK);
  });

  it("falls back when returnTo is unsafe, never trusting it as the href", () => {
    expect(resolveBackTarget("https://evil.example.com", FALLBACK)).toEqual(
      FALLBACK,
    );
  });

  it("labels a project return path", () => {
    expect(
      resolveBackTarget("/projects/abc123?tab=invoices", FALLBACK),
    ).toEqual({ href: "/projects/abc123?tab=invoices", label: "Back to Project" });
  });

  it("labels a party return path", () => {
    expect(resolveBackTarget("/parties/abc123", FALLBACK)).toEqual({
      href: "/parties/abc123",
      label: "Back to Party",
    });
  });

  it("labels the bare dashboard return path", () => {
    expect(resolveBackTarget("/", FALLBACK)).toEqual({
      href: "/",
      label: "Back to Dashboard",
    });
  });
});

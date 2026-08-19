import { describe, expect, it } from "vitest";
import {
  isSafeReturnPath,
  resolveBackTarget,
  withReturnTo,
} from "@/lib/backNavigation";

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

describe("withReturnTo", () => {
  it("appends returnTo with a leading ? when the href has no query string", () => {
    expect(withReturnTo("/projects/abc123", "/")).toBe(
      "/projects/abc123?returnTo=%2F",
    );
  });

  it("appends returnTo with a leading & when the href already has a query string", () => {
    expect(withReturnTo("/projects/abc123?tab=invoices", "/")).toBe(
      "/projects/abc123?tab=invoices&returnTo=%2F",
    );
  });

  it("URL-encodes the returnTo value", () => {
    expect(withReturnTo("/invoices/xyz", "/projects/abc?tab=invoices")).toBe(
      "/invoices/xyz?returnTo=%2Fprojects%2Fabc%3Ftab%3Dinvoices",
    );
  });

  it("leaves the href unchanged when returnTo is unset", () => {
    expect(withReturnTo("/projects/abc123?tab=invoices", undefined)).toBe(
      "/projects/abc123?tab=invoices",
    );
  });

  it("leaves the href unchanged when returnTo is unsafe, never trusting it", () => {
    expect(
      withReturnTo("/projects/abc123", "https://evil.example.com"),
    ).toBe("/projects/abc123");
  });

  it("nests through multiple hops without a fixed depth limit — dashboard → project → invoice → back to project still remembers the dashboard", () => {
    // The project page embeds its invoice table with a returnTo that itself
    // carries the project page's own incoming returnTo (this is exactly
    // what InvoicesAndAlertsTab/InvoicesTab do), so opening an invoice from
    // there and coming back doesn't strand the user on a plain project-list
    // default — it re-establishes the outer "back to dashboard" context.
    const projectReturnTo = "/"; // arrived at the project from the dashboard
    const invoiceReturnTo = withReturnTo(
      "/projects/abc123?tab=invoices",
      projectReturnTo,
    );
    const invoiceHref = `/invoices/xyz?returnTo=${encodeURIComponent(invoiceReturnTo)}`;

    // Simulates the browser/Next.js decoding the query string once on
    // navigation to that invoice URL.
    const decodedOnInvoicePage = new URL(
      `http://localhost${invoiceHref}`,
    ).searchParams.get("returnTo")!;
    expect(decodedOnInvoicePage).toBe(
      "/projects/abc123?tab=invoices&returnTo=%2F",
    );

    // Clicking "Back" from the invoice takes the user to exactly that URL,
    // which the project page then parses for its own returnTo.
    const decodedOnProjectPage = new URL(
      `http://localhost${decodedOnInvoicePage}`,
    ).searchParams.get("returnTo")!;
    expect(decodedOnProjectPage).toBe("/");
    expect(resolveBackTarget(decodedOnProjectPage, FALLBACK)).toEqual({
      href: "/",
      label: "Back to Dashboard",
    });
  });
});

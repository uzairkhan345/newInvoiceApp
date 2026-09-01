/**
 * Shared "where did the user actually come from" back-link mechanism for the
 * three detail pages (invoice/party/project) — extends the `?from=dashboard`
 * idiom already used by the list pages (`invoices/page.tsx`/`projects/page.tsx`)
 * to every list/embedded-table origin a detail page can be reached from, not
 * just the dashboard.
 */

/**
 * Only a same-app relative path is ever honored as a `?returnTo=` value —
 * guards against an open-redirect via a crafted link/URL (a bare `<Link>`
 * renders a real `<a href>`, so an unvalidated absolute URL would actually
 * navigate the browser away from the app).
 */
export function isSafeReturnPath(value: string | undefined): value is string {
  return !!value && value.startsWith("/") && !value.startsWith("//");
}

/**
 * `returnTo` values are always one of a small set WE generate (never
 * arbitrary user text), so a prefix match is enough — avoids threading a
 * separate label param through every sender for what's really just a handful
 * of known destinations.
 */
function labelForReturnPath(path: string): string {
  if (path === "/" || path.startsWith("/?")) return "Back to Dashboard";
  if (path.startsWith("/projects/")) return "Back to Project";
  if (path === "/projects" || path.startsWith("/projects?"))
    return "Back to Projects";
  if (path.startsWith("/parties/")) return "Back to Party";
  if (path === "/parties" || path.startsWith("/parties?"))
    return "Back to Parties";
  if (path.startsWith("/invoices/")) return "Back to Invoice";
  if (path === "/invoices" || path.startsWith("/invoices?"))
    return "Back to Invoices";
  return "Back";
}

export function resolveBackTarget(
  returnTo: string | undefined,
  fallback: { href: string; label: string },
): { href: string; label: string } {
  if (!isSafeReturnPath(returnTo)) return fallback;
  return { href: returnTo, label: labelForReturnPath(returnTo) };
}

/**
 * Re-attaches the current `returnTo` to a same-page internal link (a tab
 * switch, sort toggle, or edit/cancel link) — without this, following one of
 * those links drops `returnTo` entirely (it's not part of the link's own
 * href), so the back button silently reverts to the page's plain default
 * the moment the user does anything other than immediately open the invoice/
 * party/project they landed on. `href` may already have its own `?...`
 * query string (e.g. `?tab=invoices`).
 */
export function withReturnTo(
  href: string,
  returnTo: string | undefined,
): string {
  if (!isSafeReturnPath(returnTo)) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

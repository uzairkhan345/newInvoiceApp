import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * M28 — `/settings*` is `ADMIN`-only (AI provider config + user
 * management). This is the UX layer (redirect away, no nav link shown to
 * non-admins) — the real boundary is each Server Action's own
 * `requireRole(["ADMIN"])` check, since actions are callable directly
 * regardless of which page rendered their trigger. The parent `(app)`
 * layout already guarantees a session exists here at all.
 */
export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (session!.user.role !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}

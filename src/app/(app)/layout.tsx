import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

/**
 * M28 — the authoritative route gate. Every page in this app lives under
 * this route group except `/login`, so this one server-side check covers
 * all of them; it runs in the Node.js runtime (unlike `middleware.ts`,
 * which can't reach Postgres/Prisma from the Edge runtime and can only do
 * a cheap, non-authoritative early check). See
 * Docs/internal/feedback_backlog.md's M28 section.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return <AppShell role={session.user.role}>{children}</AppShell>;
}

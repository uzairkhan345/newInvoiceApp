import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

/**
 * M28 — the one page reachable without a session (outside the `(app)`
 * route group, so it renders bare, no `AppShell`). No self-registration:
 * a rejected sign-in (email not in the `User` table) redirects back here
 * with `?error=`, shown as a generic message — never anything more
 * specific about who is or isn't authorized.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            Invoice App
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your authorized Google account.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-[var(--status-overdue-bg)] px-3 py-2 text-sm text-[var(--status-overdue-text)]">
            This account isn&apos;t authorized to access this app.
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <Button type="submit" className="w-full">
            Sign in with Google
          </Button>
        </form>
      </div>
    </div>
  );
}

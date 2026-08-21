import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.766 12.276c0-.818-.074-1.606-.212-2.364H12.24v4.474h6.482a5.54 5.54 0 0 1-2.4 3.633v3.02h3.885c2.275-2.095 3.559-5.176 3.559-8.763z"
      />
      <path
        fill="#34A853"
        d="M12.24 24c3.24 0 5.956-1.075 7.942-2.91l-3.885-3.02c-1.08.724-2.462 1.15-4.057 1.15-3.127 0-5.775-2.11-6.72-4.945H1.51v3.11A11.997 11.997 0 0 0 12.24 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.52 14.275a7.2 7.2 0 0 1-.377-2.275c0-.79.136-1.556.377-2.275V6.615H1.51A11.997 11.997 0 0 0 .24 12c0 1.936.463 3.767 1.27 5.385l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12.24 4.77c1.762 0 3.344.606 4.588 1.795l3.442-3.442C18.19 1.19 15.474 0 12.24 0 7.518 0 3.44 2.69 1.51 6.615l4.01 3.11c.945-2.835 3.593-4.955 6.72-4.955z"
      />
    </svg>
  );
}

/**
 * Distinguishes the one expected auth failure (an email with no `User`
 * row — most visitors who ever see this page) from every other Auth.js
 * error code, which get one shared, non-specific message. Deliberately
 * not a full per-code breakdown: the audience here is an unauthenticated
 * visitor, who can't act on "OAuthCallback" vs "Configuration" anyway —
 * the admin diagnoses those from the server logs, not this page.
 */
function resolveErrorMessage(error: string | undefined): string | null {
  if (!error) return null;
  if (error === "AccessDenied") {
    return "This account isn't authorized to access this app.";
  }
  return "Something went wrong signing you in. Please try again — if this keeps happening, contact your admin.";
}

/**
 * M28/issue #29 — the one page reachable without a session (outside the
 * `(app)` route group, so it renders bare, no `AppShell`). No
 * self-registration: every Auth.js failure mode redirects back here with
 * `?error=` (see `src/lib/auth.ts`'s explicit `pages.error`), resolved to
 * one of two messages by `resolveErrorMessage` above.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = resolveErrorMessage(error);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-[42%] min-w-[400px] flex-col justify-between overflow-hidden bg-nav p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.16),transparent_60%)]" />
        <div className="pointer-events-none absolute -top-36 -right-36 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.28),transparent_70%)]" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-[15px] font-bold text-white">
            I
          </div>
          <span className="text-[15px] font-bold text-white">Invoice App</span>
        </div>

        <div className="relative">
          <div className="mb-5 h-[3px] w-11 rounded-full bg-brand" />
          <p className="text-xs font-bold tracking-wide text-nav-active-foreground uppercase">
            Operational view
          </p>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-nav-muted">
            Single-tenant invoice tracking — projects, parties and invoices in
            one place.
          </p>
        </div>

        <p className="relative text-[11px] text-nav-email">
          © 2026 Invoice App
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-12">
        <div className="w-full max-w-sm">
          <p className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            Sign in
          </p>
          <h1 className="mb-2 text-2xl font-extrabold tracking-[-0.02em] text-foreground">
            Welcome back
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Sign in with your authorized Google account.
          </p>

          {errorMessage && (
            <p className="mb-5 rounded-md bg-[var(--status-overdue-bg)] px-3 py-2.5 text-sm text-[var(--status-overdue-text)]">
              {errorMessage}
            </p>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button type="submit" size="lg" className="h-11 w-full gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <GoogleIcon />
              </span>
              Sign in with Google
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

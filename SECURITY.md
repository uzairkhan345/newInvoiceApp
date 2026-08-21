# Security Policy

## Scope and threat model

Invoice App is a **single-tenant application**, deployed to a real production
URL with **Google OAuth authentication and no self-registration** — a
sign-in only succeeds if the email already has a `User` row, added by an
existing admin. Session/role enforcement, not network isolation, is the
actual security boundary now. See `Docs/implementation_decisions.md` §8 for
the full auth design.

The following are treated as security guarantees worth reporting violations of:

- **Authentication/authorization**: the allowlist can't be bypassed (signing
  in with an email that has no `User` row), sessions can't be forged or
  hijacked, and role checks (`ADMIN`/`STANDARD`/`RESTRICTED`) can't be
  escalated past what a Server Action's own guard permits — see
  `src/lib/authz.ts`.
- **Payment method field values and invoice payment-detail snapshots are AES-256-GCM encrypted at rest** (`SETTINGS_ENCRYPTION_KEY`), decrypted only at document render time.
- **AI provider API keys are encrypted at rest and write-only** — never re-displayed to the client after saving.
- Financial amounts are computed server-side (with the single documented flat-amount exception) — client-submitted totals are never trusted.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Instead, use GitHub's private vulnerability reporting on this repository (Security tab → "Report a vulnerability"). Include reproduction steps and the impact you believe it has.

You should get an initial response within a week. Fixes will be committed to `main`; there are no maintained release branches.

## Out of scope

- Attacks that require an attacker's email to already have a `User` row
  (i.e. issues reachable only by someone the admin already granted access
  to) — report those as a normal bug, not a vulnerability.
- Denial-of-service against your own local or self-hosted instance.

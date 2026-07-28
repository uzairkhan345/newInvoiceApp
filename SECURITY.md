# Security Policy

## Scope and threat model

Invoice App is a **local, single-tenant, single-user application with no authentication by design** — it is intended to run on the owner's own machine, not on a public URL. That posture is documented in `Docs/implementation_decisions.md` §8, along with the intended approach (simple credentials + signed cookie session) for anyone who does want to expose it.

Within that model, the app still handles genuinely sensitive data, and the following are treated as security guarantees worth reporting violations of:

- **Payment method field values and invoice payment-detail snapshots are AES-256-GCM encrypted at rest** (`SETTINGS_ENCRYPTION_KEY`), decrypted only at document render time.
- **AI provider API keys are encrypted at rest and write-only** — never re-displayed to the client after saving.
- Financial amounts are computed server-side (with the single documented flat-amount exception) — client-submitted totals are never trusted.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Instead, use GitHub's private vulnerability reporting on this repository (Security tab → "Report a vulnerability"). Include reproduction steps and the impact you believe it has.

You should get an initial response within a week. Fixes will be committed to `main`; there are no maintained release branches.

## Out of scope

- Anything that requires the app to already be deployed on a public URL without an auth layer added — that deployment mode is explicitly unsupported.
- Denial-of-service against your own local instance.

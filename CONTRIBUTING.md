# Contributing

Thanks for your interest in improving Invoice App!

## Development setup

Follow the [Getting started](README.md#getting-started) steps in the README — Node ≥ 22, pnpm, and the Docker Postgres container are all you need.

## Before opening a PR

Run the full check set locally; all three must pass clean:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm test` includes integration tests that create and delete real rows — they run against a **dedicated test database**, never your development one. The `pretest` hook creates and migrates it automatically (`TEST_DATABASE_URL`, defaulting to `newinvoice_test` on the same Docker Postgres server). If you override `TEST_DATABASE_URL`, it must differ from `DATABASE_URL` — the suite refuses to start otherwise.

A few project conventions worth knowing:

- **Layering is strict**: components → server actions/API routes → services → repositories → Prisma. Business rules live in `src/services/`; repositories are thin Prisma wrappers with no validation or rules. UI never imports Prisma.
- **Read the decision record first** — [`Docs/implementation_decisions.md`](Docs/implementation_decisions.md) explains *why* things are the way they are (no tax fields, snapshot locking at `SENT`, the currency model, deletion rules). PRs that contradict a documented decision should argue with the decision in the PR description, not silently reverse it.
- **Schema changes** need a Prisma migration (`pnpm prisma migrate dev`) and an update to the schema tables in [`Docs/product_spec.md`](Docs/product_spec.md). Restart the dev server after migrating — the running Turbopack process can hold a stale generated Prisma client.
- **Invoice document changes** (`InvoiceDocument.tsx`, its CSS module, `buildInvoiceWorkbook.ts`) must keep the on-screen preview, the generated PDF, and the Excel output consistent with [`Docs/invoice_design_guidelines.md`](Docs/invoice_design_guidelines.md) — the preview and PDF are required to be visually identical.
- **New business logic needs tests.** Pure logic gets a unit test; anything touching the database gets an integration test following the existing create-then-clean-up pattern (see `tests/integration/` for examples).

## Commit / PR style

- Conventional-commit-style subjects (`feat:`, `fix:`, `docs:`, `chore:`, `test:`) are used throughout the history — please follow suit.
- Keep PRs focused; unrelated cleanups belong in their own PR.

## Reporting bugs

Open a GitHub issue with reproduction steps, expected vs. actual behavior, and relevant console/server output. For anything security-sensitive, use the process in [SECURITY.md](SECURITY.md) instead of a public issue.

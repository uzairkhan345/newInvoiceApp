# Invoice Application Implementation Decisions

This file records the standing implementation decisions for the single-tenant invoice tracking application — what was decided and why. It is the rationale companion to `Docs/product_spec.md`.

Each numbered section states one standing decision and its rationale.

## 1. Application Scope

The application is a **single-tenant** invoice tracking application. No multi-tenant concepts (tenant tables, organization workspaces, tenant-level row isolation, multi-organization membership).

## 2. Target Technical Stack

| Area | Decision |
|---|---|
| Frontend | Next.js / React |
| Language | TypeScript |
| Architecture | Modular monolith |
| ORM | Prisma |
| Local database | Local PostgreSQL |
| Production database | Neon PostgreSQL (target; hosting decision itself deferred, see §21) |
| Production hosting | Deferred — see §21 |

## 3. Local Development Decision

Local development runs on the developer machine: Next.js app, Prisma, local PostgreSQL, `.env.local`, development/test data only. **Per §21, local development is the current build focus — production concerns should not block or complicate the local build.**

## 4. Production Deployment Decision

Deferred — see §21. Do not assume Vercel-specific constraints (or any other target's constraints) in the core application code. The only piece of the system allowed to vary by deployment target is the PDF-generation browser-launch adapter (§12.2).

## 5. Modular Monolith Decision

Single Next.js codebase with clear internal layering (UI → Server Actions/API Routes → Business Logic Services → Repository/Data Access → Prisma → PostgreSQL). No separate backend service for v1.

## 6. Business Logic Decision

Core invoice business logic lives in TypeScript inside the Next.js application. Handles: validating invoice creation prerequisites, validating payment method ownership, calculating line item amounts and subtotal/total (no tax — see §13), creating invoice snapshots, saving invoices/items via Prisma transactions, enforcing lifecycle rules (§10).

## 7. Data Access Decision

Frontend components never call Prisma directly. Flow: Frontend Component → Server Action/API Route → Service Function → Repository Function → Prisma → PostgreSQL.

## 8. Authentication Decision

**Auth is deferred for the entire MVP development phase, not just local development.** No login system is built during initial implementation; all routes are open during development.

When the application is later exposed beyond local development, the intended approach is **simple credentials + a signed cookie session** (no third-party auth provider, no user table with roles — a single admin identity). This is recorded now so it doesn't get designed in a way that blocks adding it later (e.g. avoid assuming server-side in-memory session state anywhere), but it is explicitly **not implemented as part of MVP construction**.

## 9. Invoice Numbering Decision

Auto-generated from the project-level `invoiceNumberFormat`, editable while `DRAFT`. Supported placeholders `{abbreviation}`, `{number}`, `{date}`; date formats `MM-DD-YYYY` / `DD-MM-YYYY`.

**Uniqueness scope:** `InvoiceNumber` must be unique **within its project**, enforced as a composite unique constraint on `(ProjectId, InvoiceNumber)`. It is not required to be globally unique across projects — two different projects may coincidentally produce the same literal invoice number string.

**`{abbreviation}` source:** `Project` has an optional `Abbreviation` field, set explicitly by the admin (e.g. `"TQ"`); if left blank, it's auto-derived from the initials of `Project.Name`.

## 10. Invoice Lifecycle Decision

Stored statuses: `DRAFT`, `SENT`, `PAID`, `VOID`. `OVERDUE` remains a derived display state (`status === 'SENT' && dueDate < today`), never stored.

**Allowed status transitions:**

```
DRAFT → SENT
DRAFT → VOID
SENT  → PAID
SENT  → VOID
```

`PAID` and `VOID` are both **terminal** — neither can transition to any other status. A paid invoice can never be voided. There is no `PAID → VOID` path, and no path back to `DRAFT` from any other state.

Editing rules: `DRAFT` editable; `SENT` cannot have line items/snapshots/totals edited; `PAID` and `VOID` are read-only.

## 11. Snapshot Behavior Decision

There is no separate "refresh snapshot" user action. While an invoice is `DRAFT`, its snapshot fields (`FromPartySnapshot`, `ToPartySnapshot`, `PaymentDetailsSnapshot`) are computed from the current live `Party`/`Project`/`PaymentMethod` data every time the draft is saved — there is nothing for the user to manually trigger.

**The snapshot becomes permanently locked at the exact moment the admin finalizes the invoice — the `DRAFT → SENT` transition.** From that point forward, later edits to the source `Party`, `Address` fields, or `PaymentMethod` records must never alter the already-`SENT` invoice's stored snapshot values.

The snapshot is for **historical record purposes only** — it is not designed to support detailed audit trails (e.g. there is no requirement to track *which* live values changed between draft saves). This scoping decision also means `Invoice` does **not** store a direct `PaymentMethodId` foreign key back to the source `PaymentMethod` — `PaymentDetailsSnapshot` alone is sufficient.

## 12. Document Generation Decision

### 12.1 Excel Generation

Excel generation is implemented natively in **TypeScript** (e.g. `exceljs`), running inside the Next.js application — not as a Python subprocess or separate Python runtime.

The document layout (column widths, row heights, merged cells, the BILL TO / DETAILS / PAYMENT header structure, the separator bar color, font choices) was matched against reference invoices during design; no external reference artifact is used at runtime. All invoice data for generation comes from the Prisma schema and the invoice's own snapshot fields, never from a local profile file.

The TypeScript port must be checked cell-by-cell against the sample Excel/PDF output for layout fidelity, since `exceljs`'s API does not map 1:1 to openpyxl's.

### 12.2 PDF Generation

PDF generation uses standard **`puppeteer`**, rendering the same HTML invoice preview markup used for the on-screen preview — one template, not two, and pixel-faithful to what the admin already sees before downloading.

The browser-launch code (the part of the implementation that actually starts a Chromium instance) is isolated behind a single, swappable adapter module. This is the **only** part of the entire application allowed to vary by deployment target:
- On a persistent-process target (local dev, a droplet, Fly.io/Render/Railway, etc.), the adapter uses plain `puppeteer` with no changes needed.
- If a serverless target (e.g. Vercel) is chosen later, only this adapter is swapped to `puppeteer-core` + `@sparticuz/chromium`. The invoice HTML template and all calling code remain untouched.

No Excel-to-PDF conversion. No permanent storage of generated files — both are produced on demand.

### 12.3 Currency in Generated Documents

Both Excel and PDF generation must render amounts in the invoice's own denominated currency (`Invoice.Currency` — see §17) and, when applicable (`DUAL` mode), the invoice's locked converted-total figure in its target currency. Never hardcode a `$` sign or assume a single currency label anywhere in the output.

## 13. Tax

There is **no tax field anywhere** in the MVP — not on `Invoice`, not in any form, not in the invoice preview/PDF/Excel output. `Invoice.Total` is always equal to `Invoice.Subtotal`. This overrides the original spec's `Total = Subtotal + Tax` formula and any user story referencing a tax input. Reintroducing tax is an explicit future decision, not an MVP concern.

## 14. Logos

No logo support anywhere in MVP — no `LogoUrl` field on `Party`, no per-project toggle, no logo rendering in the invoice preview, PDF, or Excel output. This was considered and deliberately cut during the interrogation session to keep the MVP schema and document generation simple. May be revisited later as a distinct, explicitly-scoped feature (including deciding storage mechanism and whether it needs to be snapshotted).

## 15. Party Model Decision

`Party` does **not** store a `Role` field. There is no `CONTRACTOR` / `CLIENT` / `BOTH` enum anywhere in the schema. Any existing `Party` record can be freely selected as a `Project`'s contractor or as its client — including the same party in both slots — with no validation tying a stored role to how the party is actually used. `Party.Type` (`INDIVIDUAL` / `ORGANIZATION`) is unaffected and remains the only classification field on `Party`.

Consequence for the UI: there is no role-based filtering anywhere (no separate "Contractors" vs "Clients" list) — a single party roster, and both the contractor and client pickers on the Project form draw from the same full list.

## 16. Address Model Decision

Each `Party` has **at most one address** for MVP. Rather than keeping `Address` as its own joined table (which would only make sense if a party could have multiple addresses), the address fields (`Street1`, `Street2`, `City`, `State`, `PostalCode`, `Country`) are **inlined directly onto `Party`**. There is no address picker anywhere, and no "primary address" concept, because there is only ever one.

## 17. Currency Model Decision

Currency is configured **per project** — not per-invoice, not per-party. A project operates in one of two modes (`Project.CurrencyMode`):

- **`SINGLE`** (default): the project's one `DisplayCurrency` (`USD`/`AUD`/`GBP`/`NZD`/`AED`/`PKR`/`SAR`, may be USD) denominates the whole invoice — item rates, subtotal, total. No secondary figure appears anywhere.
- **`DUAL`**: every core amount is USD, and the project's non-USD `DisplayCurrency` only adds a manually-entered **converted total** on each invoice, presented alongside (never replacing) the USD figures.

Shared rules:

- **No live exchange-rate lookup.** The admin manually types any converted total directly into the invoice form; the system does not calculate it. Fetching live rates automatically is an explicit future enhancement.
- **Each invoice records the currency its core amounts are denominated in** (`Invoice.Currency`) — derived from the project's mode, never a free per-invoice selection, and locked at `SENT` along with the converted total/currency, consistent with every other snapshot-timed field. A later change to the project's currency settings does not retroactively alter a historical invoice.
- **Dashboard aggregates never blend currencies.** The primary figures sum USD-denominated invoices only; each non-USD currency present among `SINGLE`-mode invoices gets its own per-currency breakdown line. The converted total is a display-only annotation and is never included in any sum, count, or dashboard metric.

## 18. Deletion Policy Decision

MVP deletion rules are based entirely on **live foreign-key references** — never on historical snapshot data, since invoices hold fully detached copies of party/payment-method data and are therefore never a blocker to deleting the source record:

- **`Project`**: deletable only if it has **zero** `Invoice` rows. If invoices exist, the admin must delete them first before the project can be deleted — no cascading delete.
- **`Party`**: deletable only if it is not currently set as any `Project`'s contractor or client. (No historical `Invoice` ever blocks this, since `FromPartySnapshot`/`ToPartySnapshot` are detached copies.)
- **`PaymentMethod`**: deletable only if it is not currently set as any `Project`'s `PreferredPaymentMethodId`. (No historical `Invoice` ever blocks this either, since `PaymentDetailsSnapshot` is a detached copy and there is no live `PaymentMethodId` foreign key on `Invoice` — see §11.)
- **`Invoice`**: deletable in **any** status, with an admin confirmation prompt, cascading its `InvoiceItem` rows. This is the mechanism that makes the `Project` deletion rule above actually satisfiable.

## 19. AI-Assisted Data Entry Decision

A chat-style "AI assist" panel is available on the **Party**, **Payment Method**, and **Invoice** creation forms — **explicitly not on the Project form**. The admin can type a natural-language prompt and have the assistant populate the visible form fields.

Governing rules:

- **Staging only, never auto-submit.** The assistant only ever fills in form fields for the human to review; it never creates/saves a record directly. Every AI-populated form still goes through the exact same manual Save/Submit action and the exact same validation as fully hand-typed input.
- **Pure progressive enhancement.** Every form must be 100% usable with the AI panel entirely absent, unconfigured, or failing — there is no degraded/error UI state for this; it simply isn't present when unavailable. No form's core functionality may depend on it.
- **No entity resolution required.** No form needs the assistant to match free text against existing database records:
  - `Party` has no relational fields to resolve.
  - `PaymentMethod`'s owning contractor is always fixed by the context it's created from (e.g. an "Add Payment Method" action on a specific contractor's page), never typed/matched by the assistant.
  - `Invoice` inherits its contractor, client, and payment method entirely from the project selected before the invoice form is ever shown (see §20) — the assistant only fills free-text/numeric fields (line items, dates, invoice-number override).
  - `Project` is excluded from the AI panel entirely, which is exactly the one form that *would* have needed entity resolution (matching prompt text to existing parties/payment methods) — so no form anywhere requires that capability.
- **Provider-agnostic and user-configurable.** The underlying LLM is not hardcoded to one vendor. Providers expected for MVP: **Google (Gemini)**, **Anthropic (Claude)**, and **Groq**. This requires a small provider-abstraction layer in the business logic (not tied to any one vendor SDK). The primary model, ordered fallback sequence, and API key(s) are DB-backed, editable via a real in-app `/settings` page (one row per fixed provider — `google`/`anthropic`/`groq`, no dynamic provider list — holding an encrypted API key, an ordered free-text model list, an `enabled` flag, and a cross-provider cascade `order`). Motivation: on both realistic deployment targets (Vercel, a DigitalOcean droplet — §21), an env-var change doesn't take effect without a redeploy/process-restart, defeating "configure once, used from that point onward" — Postgres is already a hard dependency on every target considered, so moving config there adds no new infrastructure. Keys are write-only from the UI (masked once set, never re-decrypted to the client, no test-call-on-save validation); runtime fallback walks two levels (providers in `order`, then each provider's models in list order) with the same catch-all/log-and-continue failure handling as before. A new `SETTINGS_ENCRYPTION_KEY` env var encrypts keys at rest — the only AI-related env var remaining, the rest removed entirely. The settings page itself has no auth, consistent with the app's current no-auth posture — a flagged pre-deployment blocker (§8).

## 20. Standing UI/Workflow Pattern

Any screen that depends on a prerequisite entity existing first must **gate on selecting that prerequisite**, rather than embedding the selection as just another field deep in a longer form:

- **Create Invoice** always starts with a mandatory **project picker** showing existing projects. An invoice cannot be started without picking one first. Once picked, contractor, client, preferred payment method, and invoice-number format are all pre-filled from that project.
- **Create Project** always starts with picking existing **contractor and client parties** (from the single unified party list — see §15). If the needed party doesn't exist yet, there is an inline "**+ Create new party**" escape hatch so the admin doesn't have to abandon the project form to go create one elsewhere.

This is a standing pattern, not a one-off: any future dependent-entity flow should follow the same "select the prerequisite first, with an inline create-new escape hatch if none exist" shape.

## 21. Deployment Target Decision

The production hosting target (Vercel, a DigitalOcean droplet, or another option) is **explicitly not decided** and should not be decided implicitly by how the code is written. Development currently focuses **exclusively on the local development environment.**

The application must be built so that it runs correctly in local development without assuming any particular production target's constraints. The **only** part of the system permitted to be deployment-target-specific is the PDF browser-launch adapter (§12.2) — everything else (database access via `DATABASE_URL`, business logic, the AI-assist provider abstraction, Excel generation) is already environment-driven and needs no target-specific branching.

When the hosting decision is eventually made, known tradeoffs to weigh (not a decision to make now):
- **Vercel + Neon**: needs Neon's pooled connection string (or PgBouncer) in front of Prisma to avoid connection exhaustion under serverless concurrency; needs the Puppeteer adapter swapped to `puppeteer-core` + `@sparticuz/chromium`; function execution time limits apply to the PDF-download route.
- **A persistent VM (e.g. DigitalOcean droplet)**: avoids all of the above serverless-specific concerns (one long-lived process, no connection-pool exhaustion risk, no bundle-size/cold-start issues for Puppeteer), at the cost of self-managed OS patching, process supervision (pm2/systemd), and TLS/reverse-proxy setup.

## 22. Additional Resolved Decisions

- **`ConvertedTotal`/`ConvertedCurrency` snapshotting — confirmed** per §17's recommended default (full detail there, not repeated here).
- **AI-assist provider/model/key configuration is DB-backed** — a real in-app `/settings` page (encrypted API keys, ordered free-text model lists, a cross-provider cascade order); the only AI-related environment variable is `SETTINGS_ENCRYPTION_KEY`. Full current shape and motivation in §19 above.
- **Excel/PDF templates — a single template for MVP** (full detail in §12), matching the one reference sample. Left extensible (e.g. a future `templateId`) but not built now.
- **Eventual production hosting target — Vercel + Neon** (full detail in §2/§21). Does not change §21: the build itself still focuses exclusively on local development.

Schema/behavior additions beyond the original spec (see `Docs/product_spec.md` for the corresponding schema tables):

- **`Project.Abbreviation`** (optional text) — added to source the `{abbreviation}` invoice-number placeholder (§9), which the original format examples reference but no field ever supplied. Falls back to auto-derived initials of `Project.Name` if left blank.
- **`InvoiceItem.SortOrder`** (int) — added because Postgres rows have no inherent order; needed to preserve line-item display order, which the original spec's "ordered array" framing assumed implicitly.
- **`PaymentMethod.IsDefault`** — the application enforces at most one default per party (setting a new default un-sets any prior one). Not stated explicitly in the original spec, but a cheap, sensible invariant for a "global fallback" flag.
- **Invoice deletion** — not explicitly specified anywhere except implied by `Project` deletion requiring invoices be removed first (§18, Story 3.4). Default: an `Invoice` may be deleted in **any** status (with a confirmation prompt, since `PAID`/`VOID` are otherwise read-only everywhere else), cascading its `InvoiceItem` rows. Flagged as a gap-fill default, not a deeply-considered policy — revisit if a stricter rule (e.g. blocking deletion of `PAID` invoices) is actually wanted.

## 23. Line Item Pricing Mode & Invoice Notes Decision

Prompted by a canonical reference invoice that showed content the schema had no home for (a flat-amount line with no quantity/rate, and free-text notes around the item table).

- **`InvoiceItem.IsFlatAmount`** (boolean, default `false`) — a per-line-item toggle, mixable within a single invoice, between:
  - **Hourly** (`false`, the only previously-supported mode): `Quantity`/`UnitPrice` required, `Amount = Quantity × UnitPrice` always backend-computed — §6's existing rule is unchanged for this mode.
  - **Flat** (`true`): `Quantity`/`UnitPrice` are `null`; `Amount` is entered directly by the admin and trusted as submitted. **This is the one narrow, deliberate exception to "amount is always backend-calculated, never trusted from the client"** (§6, `Docs/product_spec.md` §1.5) — there is nothing to compute a flat amount from, so the client-submitted value must be the source of truth for that one field on that one row.
- **`Invoice.ItemsNote`/`Invoice.BottomNote`** (both optional text) — two independent, plain admin-authored fields, not a snapshot of live external data. Both follow the same `DRAFT`-editable/locked-once-`SENT` rule as `InvoiceNumber` and the other plain invoice fields — no new snapshot-timing logic was needed.

## 24. Project Alert Schedule Decision

M29 — day-of-month reminders for a `Project`, scoped via a `/grill-me` session. A direct continuation of a gap M27 deliberately left unbuilt: M21's original "recurring schedule + notification delivery" framing was superseded by M27's computed-on-load dashboard alert surfaces, with the richer mechanism explicitly noted as needing its own milestone if ever wanted.

- **In-app only, no notification infrastructure.** No scheduler/cron, no email/push, no dependency on authentication (which doesn't exist yet). Delivery is entirely through the existing dashboard Priority Feed (M27) plus the project's own detail page.
- **Recurring is per-schedule, not per-project.** A project may have several alerts, each independently toggled recurring-vs-one-time — resolving the open question M21/M27 carried forward in favor of the more flexible per-schedule shape, matching how a user actually adds them one at a time.
- **`ClearedAt`-based state machine, not a separate "occurrence" table.** A single nullable timestamp encodes the entire fired/cleared/re-armed lifecycle: for a recurring schedule, `ClearedAt` falling in the current calendar month hides it, any earlier month re-arms it automatically; for a one-time schedule, any non-null `ClearedAt` hides it permanently. `Docs/product_spec.md` §1.6 has the field description; `src/lib/alertScheduleFiring.ts` has the exact logic.
- **Day-of-month clamping reuses the `invoicePeriodType`/`computeDueDate` precedent** (`src/lib/invoicePeriod.ts`): day 31 fires on Feb 28/29 rather than being skipped, computed UTC-anchored to avoid local-timezone drift, same convention as the rest of the app's date math.
- **Purely calendar-driven firing — never suppressed by invoice status.** Clearing is the only mechanism for "I've handled this," rather than trying to infer completion from whether an invoice exists for some ill-defined "current period" (unlike `InvoicePeriodType`, an alert schedule has no inherent period concept to check against).
- **Config lives on the Project's own detail page; fired-and-uncleared state is dual-surfaced.** Both the dashboard Priority Feed and the project's own page read through the same service function and share the same "Clear" action component — clearing from either place is reflected on both immediately (via revalidating both paths in the server action), rather than each surface independently tracking its own copy of the state.
- **Embedded dialog only, no full-page create/edit route.** Unlike `PaymentMethod`/`Party` (whose dialog-based quick-create is a one-off escape hatch alongside a full-page CRUD flow), this entity's form is small enough (day, recurring toggle, optional label) that the dialog is the *only* CRUD surface — a full-page nav-away/back round trip per alert would fight the "add several in one sitting" workflow the feature was built for.
- **Dashboard integration reuses the existing "setup" (amber) tone** rather than introducing a new color token, and fired alerts sit in Priority Feed ordering right after overdue invoices (self-defined "act today" triggers, as time-sensitive as overdue) and ahead of setup gaps/stale drafts. No new `AlertBanner` chip was added — every existing chip links to one filtered-list route, and fired alerts span arbitrary projects with no equivalent single route; the Priority Feed's direct link + inline Clear button is already more actionable, and the banner's headline count already folds fired alerts in for free.
- **Cross-project dashboard scoping is `ACTIVE`-projects-only**, matching the precedent set by the missing-payment-method dashboard query and M25's "Used by" tags — an archived project shouldn't keep surfacing on the dashboard. The project's own detail page shows its full configured schedule list regardless of the project's own status, since that's direct configuration, not a system-wide nag surface.

# Invoice Application Implementation Decisions

This file records implementation decisions for the first version of the single-tenant invoice tracking application. It supersedes `ai_context/01_product_specs/implementation_decisions.md` in full — that file is stale and should not be used going forward (see `Docs/README.md`).

Sections 1–12 restate the original decisions that still hold. Section 13 onward records everything decided in the pre-implementation interrogation ("grill") session on 2026-07-08, several of which explicitly override the original spec/user-stories documents.

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
| Production database | Neon PostgreSQL (target; hosting decision itself deferred, see §16) |
| Production hosting | Deferred — see §16 |

## 3. Local Development Decision

Local development runs on the developer machine: Next.js app, Prisma, local PostgreSQL, `.env.local`, development/test data only. **Per §16, local development is the current build focus — production concerns should not block or complicate the local build.**

## 4. Production Deployment Decision

Deferred — see §16. Do not assume Vercel-specific constraints (or any other target's constraints) in the core application code. The only piece of the system allowed to vary by deployment target is the PDF-generation browser-launch adapter (§14.2).

## 5. Modular Monolith Decision

Unchanged: single Next.js codebase with clear internal layering (UI → Server Actions/API Routes → Business Logic Services → Repository/Data Access → Prisma → PostgreSQL). No separate backend service for v1.

## 6. Business Logic Decision

Core invoice business logic lives in TypeScript inside the Next.js application. Handles: validating invoice creation prerequisites, validating payment method ownership, calculating line item amounts and subtotal/total (no tax — see §13), creating invoice snapshots, saving invoices/items via Prisma transactions, enforcing lifecycle rules (§15).

## 7. Data Access Decision

Frontend components never call Prisma directly. Flow: Frontend Component → Server Action/API Route → Service Function → Repository Function → Prisma → PostgreSQL.

## 8. Authentication Decision — **updated**

**Auth is deferred for the entire MVP development phase, not just local development.** No login system is built during initial implementation; all routes are open during development.

When the application is later exposed beyond local development, the intended approach is **simple credentials + a signed cookie session** (no third-party auth provider, no user table with roles — a single admin identity). This is recorded now so it doesn't get designed in a way that blocks adding it later (e.g. avoid assuming server-side in-memory session state anywhere), but it is explicitly **not implemented as part of MVP construction**.

## 9. Invoice Numbering Decision

Unchanged: auto-generated from the project-level `invoiceNumberFormat`, editable while `DRAFT`. Supported placeholders `{abbreviation}`, `{number}`, `{date}`; date formats `MM-DD-YYYY` / `DD-MM-YYYY`.

**Uniqueness scope — resolved (was deferred):** `InvoiceNumber` must be unique **within its project**, enforced as a composite unique constraint on `(ProjectId, InvoiceNumber)`. It is not required to be globally unique across projects — two different projects may coincidentally produce the same literal invoice number string.

**`{abbreviation}` source — resolved during blueprint planning (§22):** `Project` gains an optional `Abbreviation` field, set explicitly by the admin (e.g. `"TQ"`); if left blank, it's auto-derived from the initials of `Project.Name`. This field didn't exist in the original spec even though the format examples reference `{abbreviation}` — see `Docs/execution_plan.md`.

## 10. Invoice Lifecycle Decision — **updated with explicit transition rules**

Stored statuses: `DRAFT`, `SENT`, `PAID`, `VOID`. `OVERDUE` remains a derived display state (`status === 'SENT' && dueDate < today`), never stored.

**Allowed status transitions (previously unspecified, now resolved):**

```
DRAFT → SENT
DRAFT → VOID
SENT  → PAID
SENT  → VOID
```

`PAID` and `VOID` are both **terminal** — neither can transition to any other status. A paid invoice can never be voided. There is no `PAID → VOID` path, and no path back to `DRAFT` from any other state.

Editing rules unchanged: `DRAFT` editable; `SENT` cannot have line items/snapshots/totals edited; `PAID` and `VOID` are read-only.

## 11. Snapshot Behavior Decision — **updated with explicit timing**

There is no separate "refresh snapshot" user action. While an invoice is `DRAFT`, its snapshot fields (`FromPartySnapshot`, `ToPartySnapshot`, `PaymentDetailsSnapshot`) are computed from the current live `Party`/`Project`/`PaymentMethod` data every time the draft is saved — there is nothing for the user to manually trigger.

**The snapshot becomes permanently locked at the exact moment the admin finalizes the invoice — the `DRAFT → SENT` transition.** From that point forward, later edits to the source `Party`, `Address` fields, or `PaymentMethod` records must never alter the already-`SENT` invoice's stored snapshot values.

The snapshot is for **historical record purposes only** — it is not designed to support detailed audit trails (e.g. there is no requirement to track *which* live values changed between draft saves). This scoping decision also means `Invoice` does **not** store a direct `PaymentMethodId` foreign key back to the source `PaymentMethod` — `PaymentDetailsSnapshot` alone is sufficient.

## 12. Document Generation Decision — **rewritten**

Prior guidance treated `generate_invoice.py`/openpyxl as the likely runtime implementation. That is superseded:

### 12.1 Excel Generation — **rewritten**

Excel generation is implemented natively in **TypeScript** (e.g. `exceljs`), running inside the Next.js application — not as a Python subprocess or separate Python runtime.

`ai_context/03_document_generation_reference/generate_invoice.py` and `profiles.json` are **reference-only artifacts** for layout/formatting fidelity (column widths, row heights, merged cells, the BILL TO / DETAILS / PAYMENT header structure, the separator bar color, font choices) — they are not reused as code or invoked at runtime, and `profiles.json` is dropped entirely. All invoice data for generation comes from the Prisma schema and the invoice's own snapshot fields, never from a local profile file.

The TypeScript port must be checked cell-by-cell against the sample Excel/PDF output for layout fidelity, since `exceljs`'s API does not map 1:1 to openpyxl's.

### 12.2 PDF Generation — **rewritten**

PDF generation uses standard **`puppeteer`**, rendering the same HTML invoice preview markup used for the on-screen preview — one template, not two, and pixel-faithful to what the admin already sees before downloading.

The browser-launch code (the part of the implementation that actually starts a Chromium instance) is isolated behind a single, swappable adapter module. This is the **only** part of the entire application allowed to vary by deployment target:
- On a persistent-process target (local dev, a droplet, Fly.io/Render/Railway, etc.), the adapter uses plain `puppeteer` with no changes needed.
- If a serverless target (e.g. Vercel) is chosen later, only this adapter is swapped to `puppeteer-core` + `@sparticuz/chromium`. The invoice HTML template and all calling code remain untouched.

No Excel-to-PDF conversion. No permanent storage of generated files — both are produced on demand.

### 12.3 Currency in Generated Documents

Both Excel and PDF generation must render amounts as USD (the invoice's native currency — see §17) and, when applicable, the invoice's locked converted-total figure in its target currency (see §17). Never hardcode a `$` sign or assume a single currency label across all output — the reference HTML/CSS and the reference Python script both hardcode `$`, which must not carry over.

## 13. Tax — **removed from MVP**

There is **no tax field anywhere** in the MVP — not on `Invoice`, not in any form, not in the invoice preview/PDF/Excel output. `Invoice.Total` is always equal to `Invoice.Subtotal`. This overrides the original spec's `Total = Subtotal + Tax` formula and any user story referencing a tax input. Reintroducing tax is an explicit future decision, not an MVP concern.

## 14. Logos — **removed from MVP**

No logo support anywhere in MVP — no `LogoUrl` field on `Party`, no per-project toggle, no logo rendering in the invoice preview, PDF, or Excel output. This was considered and deliberately cut during the interrogation session to keep the MVP schema and document generation simple. May be revisited later as a distinct, explicitly-scoped feature (including deciding storage mechanism and whether it needs to be snapshotted).

## 15. Party Model Decision — **new, overrides `mvp_user_stories.md` Story 1.3**

`Party` does **not** store a `Role` field. There is no `CONTRACTOR` / `CLIENT` / `BOTH` enum anywhere in the schema. Any existing `Party` record can be freely selected as a `Project`'s contractor or as its client — including the same party in both slots — with no validation tying a stored role to how the party is actually used. `Party.Type` (`INDIVIDUAL` / `ORGANIZATION`) is unaffected and remains the only classification field on `Party`.

Consequence for the UI: there is no role-based filtering anywhere (no separate "Contractors" vs "Clients" list) — a single party roster, and both the contractor and client pickers on the Project form draw from the same full list.

## 16. Address Model Decision — **new**

Each `Party` has **at most one address** for MVP. Rather than keeping `Address` as its own joined table (which would only make sense if a party could have multiple addresses), the address fields (`Street1`, `Street2`, `City`, `State`, `PostalCode`, `Country`) are **inlined directly onto `Party`**. There is no address picker anywhere, and no "primary address" concept, because there is only ever one.

## 17. Currency Model Decision — **new, replaces the original per-invoice `Currency` field**

The original spec's generic `Invoice.Currency: Text` field (implying every amount on the invoice is denominated in that currency) is replaced with the following model:

- **All core invoice financial fields are always in USD**: `InvoiceItem.UnitPrice`/`Amount`, and `Invoice.Subtotal`/`Total`. There is no per-invoice currency selection for these.
- **`Project` carries a `DisplayCurrency` setting**, one of `USD`, `AUD`, `GBP` (default `USD`). This is the only place currency is configured — not per-invoice, not per-party.
- When a project's `DisplayCurrency` is **not** `USD`, the invoice additionally shows a **converted total** in that target currency, presented alongside (not replacing) the USD figures — every other part of the invoice (line items, subtotal) stays denominated in USD.
- **No live exchange-rate lookup in MVP.** The admin manually types the converted total directly into the invoice form (a plain numeric field, e.g. "Converted Total (AUD)"); the system does not calculate it. Fetching live rates automatically is an explicit future enhancement, not MVP scope.
- **The converted total and its target currency are captured into the invoice's own record at snapshot time and locked at `SENT`**, consistent with every other financial field on the invoice — so a later change to the project's `DisplayCurrency` does not retroactively alter a historical invoice's displayed converted amount. *(This is a recommended default applying the same snapshot principle used everywhere else on the invoice — flagged for explicit confirmation since it wasn't stated outright.)*
- **Every dashboard/aggregate figure uses USD only.** The converted total is a display-only annotation on the individual invoice document and is never included in any sum, count, or dashboard metric.

Schema consequence: `Invoice` gains `ConvertedTotal: Decimal, Optional` and `ConvertedCurrency: Text, Optional` (snapshotted at creation/lock, mirroring the project's `DisplayCurrency` at that time); `Project` gains `DisplayCurrency: Enum('USD','AUD','GBP')`.

## 18. Deletion Policy Decision — **new**

MVP deletion rules are based entirely on **live foreign-key references** — never on historical snapshot data, since invoices hold fully detached copies of party/payment-method data and are therefore never a blocker to deleting the source record:

- **`Project`**: deletable only if it has **zero** `Invoice` rows. If invoices exist, the admin must delete them first before the project can be deleted — no cascading delete.
- **`Party`**: deletable only if it is not currently set as any `Project`'s contractor or client. (No historical `Invoice` ever blocks this, since `FromPartySnapshot`/`ToPartySnapshot` are detached copies.)
- **`PaymentMethod`**: deletable only if it is not currently set as any `Project`'s `PreferredPaymentMethodId`. (No historical `Invoice` ever blocks this either, since `PaymentDetailsSnapshot` is a detached copy and there is no live `PaymentMethodId` foreign key on `Invoice` — see §11.)
- **`Invoice`** *(resolved during blueprint planning, §22 — not explicit in the original spec)*: deletable in **any** status, with an admin confirmation prompt, cascading its `InvoiceItem` rows. This is the mechanism that makes the `Project` deletion rule above actually satisfiable.

## 19. AI-Assisted Data Entry Decision — **new feature, in scope for MVP**

A chat-style "AI assist" panel is available on the **Party**, **Payment Method**, and **Invoice** creation forms — **explicitly not on the Project form**. The admin can type a natural-language prompt and have the assistant populate the visible form fields.

Governing rules:

- **Staging only, never auto-submit.** The assistant only ever fills in form fields for the human to review; it never creates/saves a record directly. Every AI-populated form still goes through the exact same manual Save/Submit action and the exact same validation as fully hand-typed input.
- **Pure progressive enhancement.** Every form must be 100% usable with the AI panel entirely absent, unconfigured, or failing — there is no degraded/error UI state for this; it simply isn't present when unavailable. No form's core functionality may depend on it.
- **No entity resolution required.** No form needs the assistant to match free text against existing database records:
  - `Party` has no relational fields to resolve.
  - `PaymentMethod`'s owning contractor is always fixed by the context it's created from (e.g. an "Add Payment Method" action on a specific contractor's page), never typed/matched by the assistant.
  - `Invoice` inherits its contractor, client, and payment method entirely from the project selected before the invoice form is ever shown (see §20) — the assistant only fills free-text/numeric fields (line items, dates, invoice-number override).
  - `Project` is excluded from the AI panel entirely, which is exactly the one form that *would* have needed entity resolution (matching prompt text to existing parties/payment methods) — so no form anywhere requires that capability.
- **Provider-agnostic and user-configurable.** The underlying LLM is not hardcoded to one vendor. Providers expected for MVP: **Google (Gemini)**, **Anthropic (Claude)**, and **Groq**. This requires a small provider-abstraction layer in the business logic (not tied to any one vendor SDK). **Resolved during blueprint planning (§22):** the primary model, the ordered fallback sequence, and the API key(s) are all configured via **environment variables**, not stored in the database — no key-encryption/masking concern arises since there's no DB-persisted secret. The in-app "Configure" affordance (Story 11.4) shows a **read-only** summary of the current env-derived configuration; changing it means editing env vars and redeploying/restarting, not an in-app mutation.

## 20. Standing UI/Workflow Pattern — **new**

Any screen that depends on a prerequisite entity existing first must **gate on selecting that prerequisite**, rather than embedding the selection as just another field deep in a longer form:

- **Create Invoice** always starts with a mandatory **project picker** showing existing projects. An invoice cannot be started without picking one first. Once picked, contractor, client, preferred payment method, and invoice-number format are all pre-filled from that project.
- **Create Project** always starts with picking existing **contractor and client parties** (from the single unified party list — see §15). If the needed party doesn't exist yet, there is an inline "**+ Create new party**" escape hatch so the admin doesn't have to abandon the project form to go create one elsewhere.

This is a standing pattern, not a one-off: any future dependent-entity flow should follow the same "select the prerequisite first, with an inline create-new escape hatch if none exist" shape.

## 21. Deployment Target Decision — **deferred, explicit**

The production hosting target (Vercel, a DigitalOcean droplet, or another option) is **explicitly not decided** and should not be decided implicitly by how the code is written. Development currently focuses **exclusively on the local development environment.**

The application must be built so that it runs correctly in local development without assuming any particular production target's constraints. The **only** part of the system permitted to be deployment-target-specific is the PDF browser-launch adapter (§12.2) — everything else (database access via `DATABASE_URL`, business logic, the AI-assist provider abstraction, Excel generation) is already environment-driven and needs no target-specific branching.

When the hosting decision is eventually made, known tradeoffs to weigh (not a decision to make now):
- **Vercel + Neon**: needs Neon's pooled connection string (or PgBouncer) in front of Prisma to avoid connection exhaustion under serverless concurrency; needs the Puppeteer adapter swapped to `puppeteer-core` + `@sparticuz/chromium`; function execution time limits apply to the PDF-download route.
- **A persistent VM (e.g. DigitalOcean droplet)**: avoids all of the above serverless-specific concerns (one long-lived process, no connection-pool exhaustion risk, no bundle-size/cold-start issues for Puppeteer), at the cost of self-managed OS patching, process supervision (pm2/systemd), and TLS/reverse-proxy setup.

## 22. Decisions Resolved During Blueprint Planning — see `Docs/execution_plan.md`

The execution-plan / blueprint session (2026-07-08) resolved every item this section previously left open, and surfaced a few small additions needed to make the schema buildable. Full detail lives in `Docs/execution_plan.md`; summarized here for traceability — **nothing from the original open-questions list remains open**:

- **`ConvertedTotal`/`ConvertedCurrency` snapshotting — confirmed.** They are snapshotted and permanently locked at `DRAFT → SENT`, per §17's original recommended default.
- **AI-assist provider/model/key configuration — resolved as environment variables only**, not a database table. `AI_PRIMARY_PROVIDER`, `AI_PRIMARY_MODEL`, `AI_FALLBACK_SEQUENCE`, and per-provider API key env vars are the only configuration surface. The in-app "Configure" entry point (§19, Story 11.4) is a **read-only** display of the current env-derived configuration — changing provider/model requires editing env vars and redeploying/restarting, not an in-app mutation. This still satisfies the rule that all three AI-assist forms work perfectly with the panel absent/misconfigured.
- **Excel/PDF templates — a single template for MVP**, matching the one reference sample (`ai_context/03_document_generation_reference/`). Left extensible (e.g. a future `templateId`) but not built now.
- **Eventual production hosting target — Vercel + Neon** (per the execution plan's target stack), captured in `Docs/execution_plan.md` §15. This does **not** change §21: MVP build itself still focuses exclusively on local development, and the PDF adapter's local (`puppeteer`) implementation is what's actually built and exercised during core MVP milestones. The serverless (`puppeteer-core` + `@sparticuz/chromium`) adapter is implemented to the same interface but is only validated at the final, follow-on deployment-readiness milestone — it is not a build-blocking requirement for calling the local MVP "done."

Schema/behavior additions surfaced during blueprint planning (not in the original spec, needed to make it buildable — see `Docs/product_spec.md` for the corresponding schema table updates):

- **`Project.Abbreviation`** (optional text) — added to source the `{abbreviation}` invoice-number placeholder (§9), which the original format examples reference but no field ever supplied. Falls back to auto-derived initials of `Project.Name` if left blank.
- **`InvoiceItem.SortOrder`** (int) — added because Postgres rows have no inherent order; needed to preserve line-item display order, which the original spec's "ordered array" framing assumed implicitly.
- **`PaymentMethod.IsDefault`** — the application enforces at most one default per party (setting a new default un-sets any prior one). Not stated explicitly in the original spec, but a cheap, sensible invariant for a "global fallback" flag.
- **Invoice deletion** — not explicitly specified anywhere except implied by `Project` deletion requiring invoices be removed first (§18, Story 3.4). Default: an `Invoice` may be deleted in **any** status (with a confirmation prompt, since `PAID`/`VOID` are otherwise read-only everywhere else), cascading its `InvoiceItem` rows. Flagged as a gap-fill default, not a deeply-considered policy — revisit if a stricter rule (e.g. blocking deletion of `PAID` invoices) is actually wanted.

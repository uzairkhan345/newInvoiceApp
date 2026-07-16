# MVP User Stories

Supersedes `ai_context/01_product_specs/mvp_user_stories.md`, which is stale (see `Docs/README.md`). Use together with `Docs/product_spec.md` and `Docs/implementation_decisions.md`.

## MVP Scope Summary

The admin should be able to:

- Create and manage parties (no contractor/client role distinction — see Epic 1).
- Add payment methods for a party acting as a contractor on some project.
- Create projects linking two parties (contractor + client) picked from the same list, with a per-project display currency.
- Configure invoice number format per project.
- Create draft invoices, always starting from an existing project.
- Edit draft invoices before sending; send, mark paid, or void per the fixed lifecycle.
- View overdue invoices as a derived display state.
- Download invoice Excel and PDF files.
- View an operational (not revenue-analytics) dashboard.
- Use an optional AI-assist chat panel on Party, Payment Method, and Invoice creation forms.

Authentication is deferred for the entire MVP build (see Epic 9).

## Core Roles

**Admin** is the only user role. No auth is enforced during MVP development (Epic 9).

---

# Epic 1: Party Management

## Story 1.1: Create Party

As the admin, I want to create a party so it can later be used as a contractor and/or client on any project.

### Acceptance Criteria

- Admin enters: Name (required), Email (optional, validated if present), Type (`INDIVIDUAL` or `ORGANIZATION`), and address fields (Street/City/State/ZIP/Country — a single inlined address, not a separate address record).
- **There is no role field.** The party is not created "as a contractor" or "as a client" — it is created once and can be selected into either slot on any `Project`, including both slots at once.
- An optional AI-assist chat panel can populate these fields from a prompt; the admin still reviews and manually submits — see Epic 11.
- The new party appears in the single unified party list used everywhere a contractor or client needs to be picked.

*(This replaces the original "Create Contractor" / "Create Client" / "Support Party Roles" stories, which assumed a stored role — see `Docs/implementation_decisions.md` §15.)*

## Story 1.2: Edit Party

As the admin, I want to edit party details so future invoices use updated information.

### Acceptance Criteria

- Admin can edit profile and address fields.
- Existing `SENT`, `PAID`, or `VOID` invoices are never changed by party edits — their snapshots are locked.
- A `DRAFT` invoice's snapshot automatically reflects the current party data the next time it's saved — there is no manual "refresh" action (see `Docs/implementation_decisions.md` §11).

## Story 1.3: Delete Party

As the admin, I want to delete a party that's no longer needed, as long as doing so is safe.

### Acceptance Criteria

- A party can be deleted only if it is **not** currently set as any `Project`'s contractor or client.
- If it is in use, the admin must first remove it from (or delete) the relevant project(s).
- Deleting a party never affects any existing invoice, since invoice snapshots are fully detached copies.

---

# Epic 2: Contractor Payment Methods

## Story 2.1: Add Payment Method

As the admin, I want to add a payment method for a party acting as a contractor so invoices under a project where it's the contractor can include payment instructions.

### Acceptance Criteria

- Payment method belongs to a specific `Party` (`PartyId`).
- Includes: type (`BANK_WIRE`, `ZELLE`, `PAYONEER`, `CUSTOM`), label, default flag, and an ordered list of `{key, label, value}` fields.
- Can be selected as a project's preferred payment method for any project where this party is the contractor.
- Field order is preserved.
- This form is always entered in the context of a specific party — it is not a standalone global form, so there's never a need to search for/select the owning party via a prompt.
- An optional AI-assist chat panel can populate the label/type/field values from a prompt; the admin still reviews and manually submits — see Epic 11.

## Story 2.2: Customize Payment Field Labels

Unchanged from the original — admin can define custom `key`/`label`/`value` triples (e.g. `Transit Number`, `IBAN`, `Zelle Registered Email`); labels and values are preserved in the invoice's `PaymentDetailsSnapshot`; generated Excel/PDF show the customer-facing label, never the key.

## Story 2.3: Edit Payment Method

As the admin, I want to edit a payment method so future invoices use updated instructions.

### Acceptance Criteria

- Admin can edit label, type, default flag, and fields.
- Existing invoices of any status are unaffected — `PaymentDetailsSnapshot` is a detached copy, not a live reference.

## Story 2.4: Delete Payment Method

As the admin, I want to delete a payment method that's no longer needed, as long as doing so is safe.

### Acceptance Criteria

- Deletable only if it is not currently set as any `Project`'s preferred payment method.
- Never blocked by historical invoices — no invoice holds a live reference to a `PaymentMethod` (see `Docs/implementation_decisions.md` §11).

---

# Epic 3: Project Setup

## Story 3.1: Create Project

As the admin, I want to create a project linking a contractor and a client so invoices can be generated under it.

### Acceptance Criteria

- Requires: project name, a Contractor (picked from the full party list), a Client (picked from the same full party list — no role filtering, the same party may even be picked for both).
- If the party needed doesn't exist yet, an inline "**+ Create new party**" option is available directly from the picker, so the admin doesn't have to abandon the project form.
- Optional preferred payment method, which must belong to the selected contractor.
- A `DisplayCurrency` setting (`USD`, `AUD`, or `GBP`; default `USD`) — governs only whether invoices under this project show an additional converted total, never what currency the core invoice amounts are computed in (always USD).
- Project status: `ACTIVE` or `ARCHIVED`.
- An optional `Abbreviation` (short code, e.g. `TQ`) used to resolve the `{abbreviation}` placeholder in the invoice number format (Story 3.2); auto-derived from the project name's initials if left blank *(new — see `Docs/implementation_decisions.md` §22)*.
- **There is no AI-assist chat panel on this form** — it is filled manually.

## Story 3.2: Configure Invoice Number Format Per Project

Unchanged from the original — placeholders `{abbreviation}`, `{number}`, `{date}`; date formats `MM-DD-YYYY`/`DD-MM-YYYY`; number is unique **within the project** (composite constraint), not globally. `{abbreviation}` resolves from the project's `Abbreviation` field (Story 3.1), or auto-derived initials of the project name if left blank — see `Docs/implementation_decisions.md` §22.

## Story 3.3: Edit Project

As the admin, I want to edit project details so future invoices use the updated configuration.

### Acceptance Criteria

- Admin can edit name, client, contractor, preferred payment method, invoice number format, display currency, and status.
- If contractor changes, available preferred payment methods update accordingly.
- Existing `SENT`/`PAID`/`VOID` invoice snapshots are unaffected. A change to `DisplayCurrency` never retroactively changes a past invoice's locked `ConvertedCurrency`/`ConvertedTotal`.

## Story 3.4: Delete Project

As the admin, I want to delete a project that's no longer needed, as long as doing so is safe.

### Acceptance Criteria

- Deletable only if it has zero `Invoice` rows.
- If invoices exist, the admin must explicitly delete them first — there is no cascading delete.

---

# Epic 4: Invoice Creation

## Story 4.1: Create Draft Invoice

As the admin, I want to create a draft invoice from a project so I can review and edit it before sending.

### Acceptance Criteria

- Selecting "Create Invoice" always first shows a picker of **existing projects** — an invoice can never be started without picking one.
- Once a project is picked, the system loads contractor, client, preferred payment method, and invoice number format from it and pre-fills them — these are not re-entered.
- Admin can manually edit the auto-generated invoice number while `DRAFT`.
- Admin enters: issue date, due date, and line items (description, quantity, unit price).
- **There is no tax field anywhere on this form.**
- If the project's `DisplayCurrency` is not `USD`, the form also has a manually-entered `ConvertedTotal` field (no automatic exchange-rate calculation in MVP).
- Backend calculates: line item amount, subtotal, and total (`Total = Subtotal`, since there is no tax).
- Invoice must have at least one line item before it can be sent.
- Invoice is initially saved as `DRAFT`.
- An optional AI-assist chat panel can populate line items, dates, and the invoice-number override from a prompt — it never fills contractor/client/payment method, since those are already inherited from the selected project, not entered here. The admin still reviews and manually submits — see Epic 11.

## Story 4.2: Add Invoice Line Items

Unchanged from the original except **no tax**: description (required), quantity (`> 0`), unit price (`>= 0`), amount = `quantity * unitPrice` (backend-calculated, source of truth).

## Story 4.5: Flat-Amount Line Items and Invoice Notes *(new — M14/M15, 2026-07-16)*

As the admin, I want some line items to be a flat lump-sum amount instead of hours × rate, and to attach notes to the invoice, so I can bill retainers/arrears the same way I actually invoice clients.

### Acceptance Criteria

- Each line item has an Hourly/Flat toggle, independent per row — an invoice may mix Hourly and Flat items.
- **Hourly** (default): quantity and unit price are required; amount is backend-calculated, same as Story 4.2 — never trusted from the client.
- **Flat**: the admin enters the amount directly; quantity and unit price are not collected for that row and render as `-` on the document. This is the one narrow, deliberate exception to "amount is always backend-calculated" — there is nothing to compute a flat amount from.
- The invoice form has two independent, optional free-text fields: an **items note** (describes the line items as a whole, rendered italic below them) and a separate **bottom note** (rendered near the end of the document, bold-labeled). Either, both, or neither may be filled in.
- Both notes are ordinary `DRAFT`-editable, locked-once-`SENT` content — no new snapshot-timing rule, same as the invoice number and dates.

## Story 4.3: Edit Draft Invoice

As the admin, I want to edit draft invoices so I can correct information before sending.

### Acceptance Criteria

- `DRAFT` invoices can be edited: invoice number, issue date, due date, payment method, line items, and (if applicable) the converted total.
- Snapshot fields are automatically recomputed from current live data on every save while `DRAFT` — there is no separate manual "refresh" action.
- Totals recalculate after any line item change.

## Story 4.4: Validate Invoice Before Sending

Before `DRAFT → SENT`:

- Invoice must have a project, a contractor snapshot, a client snapshot, a payment details snapshot, and at least one line item.
- Invoice number must be present. Issue date and due date must be present, with due date on/after issue date.
- Totals must be backend-calculated.
- If the project's `DisplayCurrency` is not `USD`, `ConvertedTotal` must be present before sending.

---

# Epic 5: Invoice Lifecycle

## Story 5.1: Mark Invoice as Sent

As the admin, I want to mark a draft invoice as sent so it becomes a locked issued invoice.

### Acceptance Criteria

- `DRAFT → SENT` only.
- At this exact moment, the snapshot (contractor, client, payment details, and converted total/currency if applicable) is permanently locked.
- After `SENT`, line items, snapshots, and totals cannot be edited.

## Story 5.2: Mark Invoice as Paid

As the admin, I want to mark a sent invoice as paid so payment status is tracked.

### Acceptance Criteria

- `SENT → PAID` only.
- `PAID` is **terminal** — there is no transition out of `PAID` to any other status, including `VOID`.
- Paid invoices are read-only except payment metadata if added later.

## Story 5.3: Void Invoice

As the admin, I want to void an invoice so incorrect invoices remain in history but are excluded from calculations.

### Acceptance Criteria

- `VOID` is reachable only from `DRAFT` or `SENT`. **A `PAID` invoice can never be voided.**
- `VOID` is also terminal — no further transitions out of it.
- `VOID` invoices remain visible for history/audit, are read-only, and are excluded from all totals, dashboard metrics, and calculations.

## Story 5.4: Show Overdue State

Unchanged — `OVERDUE` is never stored; an invoice displays as overdue when `status === SENT` and `dueDate` has passed. Draft, paid, and void invoices are never shown as overdue.

## Story 5.5: Enforce Status-Based Edit Rules

- `DRAFT`: fully editable.
- `SENT`: line items, snapshots, and totals locked.
- `PAID`: fully read-only (terminal), except payment metadata if added later.
- `VOID`: fully read-only (terminal).
- The backend enforces all of this — never only the frontend.

## Story 5.6: Delete Invoice *(new — resolved during blueprint planning, see `Docs/implementation_decisions.md` §22)*

As the admin, I want to delete an invoice that's no longer needed, including to unblock deleting its parent project.

### Acceptance Criteria

- An `Invoice` may be deleted in **any** status (`DRAFT`/`SENT`/`PAID`/`VOID`), with a confirmation prompt.
- Deleting an invoice cascades its `InvoiceItem` rows.
- This is the mechanism that satisfies Story 3.4's "admin must delete them first" requirement for project deletion.

---

# Epic 6: Snapshotting and Historical Integrity

## Story 6.1: Draft Snapshots Stay Current Automatically

As the admin, I want draft invoices to reflect the latest contractor/client/payment-method information without a manual step.

### Acceptance Criteria

- While `DRAFT`, snapshot fields (contractor, client, payment details) are recomputed from current live data every time the draft is saved.
- There is no explicit "refresh snapshot" button or action anywhere in the UI.
- Draft snapshots are used for the invoice preview and for document generation while still in `DRAFT`.

## Story 6.2: Lock Snapshots on Sent

As the admin, I want invoice snapshots to lock when sent so historical records never change.

### Acceptance Criteria

- The `DRAFT → SENT` transition is the single moment snapshots (including `ConvertedTotal`/`ConvertedCurrency`) become permanently locked.
- Later changes to party, project, or payment method records never affect an already-`SENT` invoice.
- Generated Excel/PDF for `SENT`/`PAID`/`VOID` invoices always use the locked snapshot, never live data.

---

# Epic 7: Excel and PDF Generation

## Story 7.1: Download Excel Invoice

As the admin, I want to download an Excel version of an invoice so I can send or archive it externally.

### Acceptance Criteria

- Generated in **TypeScript** (`exceljs`) inside the Next.js app — not via the Python reference script at runtime.
- Layout follows `generate_invoice.py`'s formatting as a reference only (column widths, merged cells, section layout), re-verified cell-by-cell since the libraries don't map 1:1.
- Uses only saved invoice data and snapshots — never live party/payment records.
- Renders USD amounts and, if applicable, the locked `ConvertedTotal`/`ConvertedCurrency` — never a hardcoded `$`.
- Generated on demand; not permanently stored.

## Story 7.2: Download PDF Invoice

As the admin, I want to download a PDF version of an invoice so I can share a non-editable version.

### Acceptance Criteria

- Generated via `puppeteer` rendering the same HTML used for the on-screen invoice preview — one template, pixel-faithful.
- Browser-launch logic is isolated behind a swappable adapter so a serverless-specific Chromium build can be substituted later without touching the template (see `Docs/implementation_decisions.md` §12.2).
- Uses only saved invoice data and snapshots.
- Generated on demand; not permanently stored.

## Story 7.3: Use Shared Invoice Data for Generated Documents

Unchanged — both Excel and PDF use the same saved invoice record; `DRAFT` invoices use current draft snapshots, `SENT`/`PAID`/`VOID` use locked snapshots.

---

# Epic 8: Dashboard and Alerts

## Story 8.1: View Operational Dashboard

As the admin, I want to see active projects and invoice alerts so I can quickly identify pending work.

### Acceptance Criteria

- Dashboard leads with **operational counts**, not revenue figures: Active Projects, Draft Invoices (awaiting review), Sent/Unpaid Invoices, Overdue Invoices.
- No "collected this month" or other revenue-analytics framing anywhere on the dashboard.
- All dashboard figures (including any outstanding-dollar subtext) are in **USD only** — a project's `ConvertedTotal` is never included in any dashboard aggregate.
- `VOID` invoices are excluded from every dashboard count/total.
- A "Needs Attention" panel surfaces overdue invoices, drafts waiting on review, and projects missing a preferred payment method (Story 8.3), most urgent first.

## Story 8.2: View Invoice Lists by Status

Unchanged — admin can view/filter by `DRAFT`/`SENT`/`PAID`/`VOID`/derived `OVERDUE`; list shows invoice number, project, client, issue date, due date, status, and total (USD).

## Story 8.3: Highlight Configuration Issues

Unchanged — dashboard/project list indicates projects missing a preferred payment method; invoice sending is blocked with explanatory validation messages when required data is missing (Story 4.4).

---

# Epic 9: Local Development and Production Readiness

## Story 9.1: Run Application Locally

As a developer, I want to run the full application locally without any production dependency.

### Acceptance Criteria

- App runs locally on Next.js + local PostgreSQL + Prisma migrations.
- **No authentication is required or implemented during MVP development** — all routes are open locally.
- Local environment variables are documented.

## Story 9.2: Structure for a Deferred Production Deployment Decision

As a developer, I want the app structured so a production hosting decision can be made later without rework.

### Acceptance Criteria

- The production hosting target (Vercel, a droplet, or otherwise) is **not decided** and the app must not assume any target's constraints (see `Docs/implementation_decisions.md` §21). *(`Docs/execution_plan.md` §15 later records Vercel + Neon as the intended eventual target for planning purposes — this does not change MVP build scope: local development remains the exclusive focus, and the PDF adapter's local implementation is what's actually built and exercised during core milestones.)*
- The only deployment-sensitive code is the PDF browser-launch adapter (Story 7.2) — everything else works identically regardless of target, driven purely by `DATABASE_URL` and standard environment variables.

## Story 9.3: Add Single Admin Login (Deferred Beyond MVP Development)

As the application owner, I want a single admin login so the app isn't publicly open once it's exposed beyond local development.

### Acceptance Criteria

- **Not implemented during MVP development** — deferred by explicit decision.
- When implemented, the intended approach is simple credentials plus a signed cookie session — no third-party auth provider, no multi-user roles.

---

# Epic 10: Seed Data and Testing

## Story 10.1: Provide Seed Data

Seed data should include: one party used as a contractor, one party used as a client, one payment method, one project, one draft invoice, one sent invoice, one paid invoice — safe demo data, no real banking/client-sensitive information, no tax fields, no logos.

## Story 10.2: Test Invoice Calculations

Unit tests cover line item amount, subtotal, and total calculation (`Total = Subtotal`, no tax). Backend calculation is the source of truth.

## Story 10.3: Test Snapshot Behavior

Tests verify: draft snapshots reflect current data on every save; snapshots lock exactly at `DRAFT → SENT`; later party/payment edits never change a `SENT` invoice's snapshot; generated documents use the locked snapshot for non-draft invoices.

## Story 10.4: Test Status Transition Rules

Tests verify the exact allowed transitions (`DRAFT→SENT`, `DRAFT→VOID`, `SENT→PAID`, `SENT→VOID`) and reject every other transition, especially `PAID→VOID` and `PAID→` anything.

## Story 10.5: Test Deletion Rules

Tests verify `Party`/`PaymentMethod`/`Project` deletion is blocked exactly when a live foreign-key reference exists (per `Docs/implementation_decisions.md` §18), and never blocked by historical invoice snapshots.

---

# Epic 11: AI-Assisted Data Entry *(new)*

## Story 11.1: Use AI Assist to Fill the Party Form

As the admin, I want to describe a party in a prompt so the form fills itself in, saving me from typing every field by hand.

### Acceptance Criteria

- A chat-style panel is available alongside the Party creation form.
- The assistant populates Name/Email/Type/address fields from the prompt.
- The admin reviews the populated fields and submits manually — the assistant never saves the record itself.
- The form is fully usable by hand with the panel absent, unconfigured, or failing.

## Story 11.2: Use AI Assist to Fill the Payment Method Form

Same shape as 11.1, scoped to Payment Method's type/label/default/field values. The owning contractor is fixed by the page context, never something the assistant resolves.

## Story 11.3: Use AI Assist to Fill the Invoice Form

Same shape as 11.1, scoped to line items, issue/due dates, invoice-number override, and (if applicable) the converted total. Contractor, client, and payment method are never touched by the assistant — they're inherited from the project selected before this form is shown.

## Story 11.4: Configure the AI Provider, Model, and Fallback Sequence

As the admin, I want to choose which AI provider/model is used and what happens if it's unavailable.

### Acceptance Criteria

- Supported providers: Google (Gemini), Anthropic (Claude), Groq.
- **Resolved during blueprint planning** (`Docs/implementation_decisions.md` §22): the primary model, the ordered fallback sequence of alternate models/providers, and the required API key(s) are all configured via **environment variables**, not an in-app settings form.
- The "Configure" entry point on the AI-assist panel (Stories 11.1–11.3) shows a **read-only** summary of the currently-configured provider/model/fallback sequence, sourced from env vars — changing it means editing env vars and redeploying/restarting.
- If every configured option is unavailable (or none are configured at all), all three creation forms above continue to work perfectly by hand — there is no error state that blocks manual use.

*(Note: there is deliberately no Story 11.5 "Use AI Assist to Fill the Project Form" — this form is explicitly excluded, since it's the one form that would require resolving prompt text against existing parties/payment methods, which is out of scope for MVP.)*

---

# Deferred / Explicitly Excluded Features

Deferred from the original list (still not required for MVP):

- Multi-user role-based access control. Multi-tenant support.
- Automated invoice email sending. Recurring invoices.
- Permanent generated file storage. Revenue analytics dashboard.
- Full audit log. Client portal. Online payment collection.
- Excel-to-PDF conversion. Separate backend service for document generation.
- Advanced reporting. Bulk invoice generation.

**Explicitly decided against for MVP** (not just "not yet built" — actively removed from scope during the pre-implementation interrogation, see `Docs/implementation_decisions.md`):

- `Party.Role` classification (`CONTRACTOR`/`CLIENT`/`BOTH`).
- Tax fields and tax calculation anywhere in the schema or UI.
- Logo attachments (on parties, projects, or invoices).
- Multiple addresses per party.
- Automatic/live exchange-rate conversion (manual entry only for now).
- AI entity-resolution/fuzzy-matching against existing database records, anywhere.
- AI-assist on the Project creation form specifically.
- Authentication during MVP development (deferred to a later, explicitly separate phase).

---

# Suggested MVP Build Order

1. Project setup and local development environment (no auth).
2. Prisma schema and migrations (reflecting the finalized schema in `Docs/product_spec.md`).
3. Seed data.
4. Party management (single unified list, no role).
5. Payment method management.
6. Project management (party pickers with inline create-new escape hatch, display currency).
7. Invoice draft creation (project-gated entry point).
8. Invoice calculation logic (no tax).
9. Snapshot creation (automatic while draft) and locking (on send).
10. Invoice status lifecycle (exact transition rules).
11. Invoice list and detail/preview screens (including locked/read-only state).
12. Excel generation (TypeScript/exceljs).
13. PDF generation (Puppeteer + adapter).
14. Dashboard and alerts (operational, USD-only).
15. AI-assist panel (Party, Payment Method, Invoice forms; provider/model/fallback configuration).
16. Deletion flows (Party/PaymentMethod/Project, per the live-FK-based policy).
17. Production readiness planning (hosting target decision, deferred until the app is otherwise feature-complete) and single admin login.

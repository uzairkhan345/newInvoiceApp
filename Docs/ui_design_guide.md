# Docketly UI Design Guide

Supersedes `ai_context/02_ui_reference/ui_design_guide.md` (the version there is now stale — see `Docs/README.md`). This version incorporates the schema/workflow decisions finalized in the pre-implementation interrogation session (2026-07-08): no tax, no logos, no `Party.Role`, USD-primary currency model with an optional converted total, and a new AI-assist panel present on three of the four creation forms.

Extracted and reconciled from `ai_context/02_ui_reference/DESIGN_SYSTEM.md`, `design-notes.md`, `style.css`, and the five static HTML reference pages, cross-checked against `Docs/product_spec.md` and `Docs/mvp_user_stories.md`. Still does not redesign the product or invent new visual features beyond what's needed to represent decisions already made — it documents the visual direction faithfully and fills gaps the prototype left unbuilt.

---

## 0. Reconciliation Notes (what was fixed and why)

Carried forward from the prior version, plus new items from the interrogation session:

| # | Issue found | Fix applied in this guide |
|---|---|---|
| 1 | `style.css` only defines 4 status colors (`paid`, `pending`, `overdue`, `draft`). Real statuses are `DRAFT`, `SENT`, `PAID`, `VOID`, plus derived `OVERDUE`. | §11 defines all 5 badge variants, renaming `pending` → `sent`, adding `void`. |
| 2 | Status-colored badges reused for unrelated labels ("Active Partner", "Connected", cycle type). | §11 splits **Status Badge** (invoice lifecycle only) from a generic **Tag** component. |
| 3 | Inconsistent 600/700 Tailwind shade mixing across status colors. | §7 standardizes every status token to one reconciled hex value. |
| 4 | `--color-brand-light` mislabeled "Indigo-50" (it's Indigo-100). | §7 corrects the label; hex unchanged. |
| 5 | No empty-state or validation-state markup exists despite being described in prose. | §12/§13 define concrete, implementable specs. |
| 6 | Nothing shows a locked/read-only invoice, despite this being core to the lifecycle. | §15 adds a locked-state banner. |
| 7 | Dashboard (`index.html`) led with revenue figures and a fabricated automation/cron panel. | §16 redefines the dashboard around projects/drafts/sent/overdue/missing-setup, USD-only. |
| 8 | `projects.html`/`payments.html` framed the product as a Stripe/PayPal recurring-billing platform, which doesn't match the data model. | §4 names the correct entities so visual patterns are reused without the wrong business framing. |
| 9 | Inline `style="..."` attributes used for one-off sizing instead of modifier classes. | §8/§11 formalize `.btn-sm` and badge/tag sizing. |
| 10 | Amounts hardcoded with a literal `$` everywhere. | §17 (rewritten) — amounts are USD by construction now, but the currency **label** must still render explicitly, and a second, distinctly-styled converted-total figure must appear when applicable. |
| **11 (new)** | The invoice preview's totals block includes a "Tax (0.0%)" row. There is no tax in MVP at all. | §15 removes the tax row outright — the totals block is now Subtotal → Total only (plus the optional converted-total line). |
| **12 (new)** | `parties.html` implies separate contractor/client rosters with role-based filtering. `Party.Role` doesn't exist. | §4/§9 confirm a single unified party list everywhere — no role tabs, no role filter, no role tag. |
| **13 (new)** | No layout pattern exists anywhere for the new AI-assist chat panel — it wasn't part of the original prototype at all. | §14 (new) defines a dedicated layout and component pattern for it. |
| **14 (new)** | The original per-invoice `Currency` concept (all amounts in one currency) doesn't match the finalized model (USD-primary + optional converted total). | §17 rewritten to define exactly how/where the converted total appears without disturbing the primary USD figures. |

---

## 1. Overall Visual Direction

**Docketly Indigo** — a Swiss-influenced, high-density operational workspace, not a marketing-style SaaS dashboard. Unchanged from the prior version:

- Light theme only. Cool neutral canvas (`slate-50`) isolating pure white cards.
- A single restrained brand accent (indigo), never decorative.
- Two typefaces carry the hierarchy: geometric sans for UI text, monospace for anything numeric or identifier-shaped.
- Density over whitespace-for-its-own-sake — this is a daily-use admin tool.
- Every card, table, badge, and alert must support a real decision.

---

## 2. Layout System

- **Dual-frame canvas**: fixed-width left sidebar + fluid main stage, `max-width: 1200px`, `padding: 40px` desktop / `16px` mobile.
- **Asymmetric grid**: `2fr/1fr` (`.layout-grid`) for primary content + supporting context. Single-column stacks use `.layout-single`.
- **Three-panel variant (new)**: creation forms that include the AI-assist panel (§14) use a `2fr/1fr` split where the `1fr` slot is the assist panel instead of a generic "context" card — see §14 for when this applies.

```
┌──────────────┬────────────────────────────────────────────┐
│              │  page-header (title + primary action)       │
│   sidebar    ├────────────────────────────────────────────┤
│   260px      │  stats row (if applicable)                  │
│   fixed      ├───────────────────────────┬──────────────────┤
│              │  primary panel (2fr)      │  context OR      │
│              │  (form / table)           │  AI-assist (1fr) │
└──────────────┴───────────────────────────┴──────────────────┘
```

---

## 3. Navigation Structure

Unchanged from the prior version:

- Sidebar `260px` fixed, white, `1px` right border. Header: brand icon + name + uppercase sub-label.
- Nav items: `13px` semibold, `16px` icons, active state = brand-light background + brand text.
- Footer: avatar + name + muted email, truncating.
- **Setup-alert indicator**: small count badge on the Invoices/Projects nav item when overdue invoices exist or a project is missing a preferred payment method — reuses the Tag component's small circular variant (§11).
- Mobile (`<1024px`): sidebar collapses to an overlay drawer.

---

## 4. Page Templates

| Template | Used by | Notes |
|---|---|---|
| **Dashboard** | Dashboard | See §16. |
| **List/Ledger** | Invoices list, Projects list, **Parties list (single unified roster — no role tabs, no role filter)** | Since `Party.Role` doesn't exist, the Parties page is one plain table, not a contractor/client split. |
| **Form/Detail — with AI assist** | Create Party, Add Payment Method, Create/Edit Draft Invoice | Uses the three-panel layout (§2/§14): form on the left, AI-assist chat on the right. |
| **Form/Detail — no AI assist** | Create/Edit Project | Uses the plain `2fr/1fr` layout: form left, a normal supporting-info card right (e.g. existing project list) — **never an AI-assist panel here**, by explicit decision. Contractor/Client pickers each need an inline "+ Create new party" affordance for when the list is empty. |
| **Document Preview** | Invoice detail/preview | See §15. Must support both editable (`DRAFT`) and locked (`SENT`/`PAID`/`VOID`) states. |

---

## 5. Typography

Unchanged:

| Role | Size | Weight | Tracking | Color |
|---|---|---|---|---|
| Page title (`h1`) | 24px | 800 | -0.02em | text-primary |
| Page subtitle | 13px | 400 | normal | text-secondary |
| Card/section title | 15px | 700 | normal | text-primary |
| Body / table cell | 13px | 400–600 | normal | text-primary / text-secondary |
| Form label | 11px | 700 | 0.05em, uppercase | text-secondary |
| Table header | 11px | 700 | 0.05em, uppercase | text-secondary |
| Stat value | 24px | 800 | normal | text-primary, **mono** |
| Badge/tag text | 10px | 700 | uppercase | per-variant |
| Invoice doc ID | 20px | 800 | normal | brand, mono |
| Invoice grand total | 18px | 800 | normal | text-primary, mono |
| **Converted-total figure (new)** | 13px | 700 | normal | text-secondary, mono — deliberately smaller/quieter than the primary USD total so it reads as secondary information, never competing with it. |

Sans = Inter, Mono = JetBrains Mono, loaded via `next/font`.

---

## 6. Spacing Scale

Unchanged — stage padding 40/16px, card padding 24px (body)/20×24px (header), row-section gap 32px, panel gap 24px, form-field gap 16px, inline-control gap 8–12px.

---

## 7. Color Tokens

| Token | Hex | Tailwind equivalent | Usage |
|---|---|---|---|
| `--color-brand` | `#6366f1` | indigo-500 | Primary actions, active state, invoice ID |
| `--color-brand-hover` | `#4f46e5` | indigo-600 | Primary button hover |
| `--color-brand-light` | `#e0e7ff` | indigo-100 *(corrected label)* | Active nav bg, default-method tag, date chips |
| `--bg-main` | `#f8fafc` | slate-50 | App canvas |
| `--bg-card` | `#ffffff` | white | Cards, sidebar, table |
| `--text-primary` | `#0f172a` | slate-900 | Headings, primary data |
| `--text-secondary` | `#475569` | slate-600 | Body, labels |
| `--text-muted` | `#94a3b8` | slate-400 | Captions, muted metadata |
| `--border-light` | `#e2e8f0` | slate-200 | Card/table borders |
| `--border-heavy` | `#cbd5e1` | slate-300 | Input borders |

### Status tokens (invoice lifecycle only — see §11)

| Status | Background | Text |
|---|---|---|
| `DRAFT` | `#f1f5f9` | `#475569` |
| `SENT` | `#fffbeb` | `#b45309` |
| `PAID` | `#ecfdf5` | `#047857` |
| `VOID` | `#fff1f2` | `#be123c` |
| `OVERDUE` *(derived)* | `#fef2f2` | `#b91c1c` |

### Semantic (validation/alert) tokens

| Token | Background | Border | Text |
|---|---|---|---|
| `--alert-info-bg` | `#f8fafc` | border-light | text-secondary |
| `--alert-warning-bg` | `#fffbeb` | `#fde68a` | `#92400e` |
| `--alert-error-bg` | `#fef2f2` | `#fecaca` | `#b91c1c` |
| `--alert-success-bg` | `#ecfdf5` | `#a7f3d0` | `#047857` |

---

## 8. Card Style & Buttons

Unchanged: white card, `1px solid border-light`, `10px` radius, `shadow: 0 1px 2px rgba(0,0,0,0.05)`; header `20px 24px` + bottom border; body `24px`.

| Variant | Style | Hover |
|---|---|---|
| `.btn-primary` | Solid brand bg, white text, semibold | brand-hover bg |
| `.btn-secondary` | White bg, border-light, secondary text | bg-main tint |
| `.btn-sm` | `font-size: 11px; padding: 4px 10px;` combine with primary/secondary | same as base |

---

## 9. Table Style

Unchanged — `.table-container` wrapper, header `14px 20px` padding/`#f8fafc` bg/`11px` bold uppercase, body cell `16px 20px`/`13px`, row hover tint, numeric/ID columns in mono, right-aligned amounts.

**Parties table specifically**: one column set for everyone — no role column, no role-based badge. `Type` (`INDIVIDUAL`/`ORGANIZATION`) may appear as a neutral Tag (§11) if useful, but it's informational only, never a filter axis in MVP.

Every list table needs a defined empty state (§12) for zero rows.

---

## 10. Form Style

Unchanged: `.form-group` column flex, `6px` gap, `16px` bottom margin; label `11px` bold uppercase; input/select `36px` height, `border-heavy`, `13px`, `8px` radius, focus → brand border + visible focus ring (`2px` brand at 30% opacity — add this; the prototype only changes border color, which isn't sufficient for keyboard accessibility). Required fields marked `*`.

**Relational pickers (Contractor, Client, Project, Payment Method)**: standard `.form-select`, each optionally paired with an inline "+ Create new [entity]" link/button directly beneath or beside it when the list might be empty (Project form's Contractor/Client pickers — see §4).

See §13 for the error state.

---

## 11. Status Badges & Tags

Unchanged in structure from the prior version — two distinct components, same base shape, different palettes:

### Status Badge — invoice lifecycle only

```
.badge-draft    { background: #f1f5f9; color: #475569; }
.badge-sent     { background: #fffbeb; color: #b45309; }
.badge-paid     { background: #ecfdf5; color: #047857; }
.badge-void     { background: #fff1f2; color: #be123c; }
.badge-overdue  { background: #fef2f2; color: #b91c1c; }  /* derived: status=SENT && dueDate < today */
```

`OVERDUE` is never stored — compute it at render time and swap the badge, never show both.

### Tag — everything else

```
.tag-neutral  { background: #f1f5f9; color: #475569; }  /* e.g. INDIVIDUAL / ORGANIZATION, ARCHIVED */
.tag-brand    { background: var(--color-brand-light); color: var(--color-brand); }  /* e.g. Default payment method, ACTIVE project */
```

---

## 12. Empty States

Unchanged:

```
.empty-state       { display:flex; flex-direction:column; align-items:center; text-align:center; padding: 48px 24px; gap: 8px; }
.empty-state-icon  { width:48px; height:48px; border-radius:50%; background: var(--bg-main); display:flex; align-items:center; justify-content:center; color: var(--text-muted); }
.empty-state-title { font-size:13px; font-weight:700; color: var(--text-primary); }
.empty-state-desc  { font-size:11px; color: var(--text-muted); max-width: 280px; }
```

Applies to: "No parties yet" → "Create your first party"; "No payment methods" → "Add a payment method"; "No projects yet" → "Create your first project" (shown at the mandatory project-picker gate on Create Invoice, §4); "No invoices yet" → "Create your first invoice."

---

## 13. Validation States

Unchanged:

```
.form-input.is-error, .form-select.is-error { border-color: #dc2626; }
.form-error-text { font-size: 11px; color: #b91c1c; margin-top: 4px; }

.alert           { border-radius: var(--radius-sm); border: 1px solid; padding: 12px 16px; font-size: 11px; line-height: 1.4; }
.alert-info      { background: var(--alert-info-bg); border-color: var(--border-light); color: var(--text-secondary); }
.alert-warning   { background: var(--alert-warning-bg); border-color: #fde68a; color: #92400e; }
.alert-error     { background: var(--alert-error-bg); border-color: #fecaca; color: #b91c1c; }
.alert-success   { background: var(--alert-success-bg); border-color: #a7f3d0; color: #047857; }
```

`alert-warning` for "missing preferred payment method" / "no line items yet"; `alert-error` for blocked-send validation (Story 4.4's checklist — no tax condition anymore, but due-date-after-issue-date, converted-total-required-if-non-USD, etc.); `alert-success` for confirmations.

---

## 14. AI-Assist Panel *(new)*

A persistent right-hand panel (`1fr` slot in the three-panel layout, §2) alongside the **Party**, **Payment Method**, and **Invoice** creation forms only — **never on the Project form**.

- **Structure**: a card (`.card`) titled "AI Assist" (or similar), containing a scrollable message/prompt history area and a bottom-anchored text input + send button — a standard chat-panel shape, not a novel widget.
- **Behavior signal**: after a prompt is processed, the corresponding form fields visibly populate/highlight briefly (e.g. a momentary `brand-light` background flash on the affected fields) so the admin can see exactly what changed before reviewing and submitting — the panel never submits the form itself.
- **Absence is normal, not broken**: when unconfigured or failing, the panel either doesn't render at all or shows a quiet, low-emphasis empty state (not an `alert-error`) — this is a progressive enhancement, not a required part of the page. The form itself never indicates anything is "missing."
- **Settings entry point**: a small `.btn-secondary.btn-sm` "Configure" affordance in the panel header opens a **read-only summary** of the current provider/model/fallback configuration, sourced from environment variables rather than an editable in-app form (`Docs/mvp_user_stories.md` Story 11.4; resolved in `Docs/implementation_decisions.md` §22) — kept out of the main form flow entirely.

---

## 15. Invoice Preview Layout — **rewritten 2026-07-10, letterhead redesign**

Superseded the original abstract "2×2 address grid" version below (built for M7) after reviewing real reference invoices in `ai_context/03_document_generation_reference/` (the sample PDFs, `screenshots/`, and `generate_invoice.py`) — the on-screen preview/PDF is now deliberately restyled to closely resemble that reference's letterhead-style layout, brought into the app's own Docketly Indigo tokens (never a plain Arial/black-and-white copy). This also brings the preview/PDF's structure into alignment with §11's Excel plan (contractor letterhead, BILL TO/DETAILS/PAYMENT, item table with Qty/Rate columns), which the old M7 version had drifted from.

Centered white document, `1px` border-light, `8px` radius (flatter than the `14px` used on dashboard cards — a document reads more official with sharper corners), `48px` padding (→ `20px` mobile), `max-width: 800px`.

- **Letterhead row**: contractor identity on the left — name (`15px`/`700`/text-primary), then address lines (`13px`/text-secondary), one per line, sourced from `FromPartySnapshot`. Right-aligned: `INVOICE #` (`11px`/`700`/uppercase/text-muted label) over the invoice number (`18px`/`800`/mono/brand — a reference-code treatment), then `Issued` + the issue date (`13px`/text-secondary) beneath it.
- **Separator bar**: a full-width `4px` solid `--brand` (indigo) rule directly beneath the letterhead row, `20px` margin above and below — the one deliberate color accent on the page (replaces the reference's generic slate-gray bar with the app's own brand color).
- **Title row**: "Invoice" (`28px`/`800`/tight tracking/text-primary) on the left; the `StatusBadge` (§11) vertically centered on the right — the one element the reference has no equivalent for, since it has no lifecycle concept.
- **3-column meta grid** (`grid-cols-1 sm:grid-cols-3`, `24px` gap): each column has an `11px`/`700`/uppercase/text-muted label, then `13px` content.
  - `BILL TO` — client name (`700`) + address lines, from `ToPartySnapshot`.
  - `DETAILS` — the project name (there is no separate free-text "service description" field on `Invoice`/`Project`; the project name serves the same "what this invoice is for" purpose the reference's `DETAILS` column carries — see the note below).
  - `PAYMENT` — `Due: {DueDate}` only. (The actual payment method fields render in their own section further down, matching the reference's own separation between this mini-column and its bottom "Payment to be made to:" block.)
- **Line items table**: `DESCRIPTION | QTY | RATE | AMOUNT` — **not** description-and-amount-only as the superseded version had it; every reference sample shows quantity/rate, so they render here too, right-aligned, mono. Header row `11px`/`700`/uppercase/text-muted with a bottom hairline; a hairline separates each row.
- **Totals block** — unchanged from the superseded version, no tax row:
  ```
  Subtotal ......................... $X,XXX.XX
  Total ............................ $X,XXX.XX   (bold, 18px, mono — always equals Subtotal)
  ─────────────────────────────────────────────
  Converted Total (AUD/GBP) ........ A$X,XXX.XX  (only if project.DisplayCurrency ≠ USD;
                                                    13px, mono, text-secondary — visually
                                                    secondary to the USD total above it)
  ```
- **Payment details section**: `PAYMENT DETAILS` label, then `label`/`value` rows rendered from `PaymentDetailsSnapshot` — customer-facing `label`, never the `key`.

**Deliberately not carried over from the reference**: the reference's optional italic per-invoice description line and its separate "Note: work done from X to Y" line (see `generate_invoice.py`'s `description`/`start_date`/`end_date` handling) have no corresponding field anywhere in the `Invoice`/`Project` schema — adding them would be a schema decision, not a layout one, so they're intentionally left out of this pass rather than silently invented. Revisit as an explicitly-scoped schema addition if wanted.

**Locked state**: when status is `SENT`, `PAID`, or `VOID`, render a read-only banner above the document's letterhead:

```
.doc-lock-banner { display:flex; align-items:center; gap:8px; background: var(--bg-main); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 10px 16px; font-size: 11px; color: var(--text-secondary); margin-bottom: 16px; }
```

Copy: "This invoice is locked. Line items, snapshots, and totals can no longer be edited." No edit controls render at all in this state.

---

## 16. Dashboard Design Rules

- **Stats row** — counts, not a revenue ticker: **Active Projects**, **Draft Invoices** (awaiting review), **Sent/Unpaid Invoices**, **Overdue Invoices**. An outstanding-dollar figure may appear as secondary subtext (**always in USD**), never the card's headline metric, and never a "Collected This Month" card.
- **Primary panel (2fr)**: "Needs Attention" — overdue invoices, drafts waiting on review, projects missing a preferred payment method, most urgent first.
- **Context panel (1fr)**: "Recent Activity" — a plain log of real lifecycle events (sent, paid, voided, project created). No cron/automated-dispatch content.
- `VOID` invoices excluded from every dashboard count and total.
- **Currency rule**: every dashboard figure is USD. A project's converted total is a per-invoice display annotation only and must never be summed into any dashboard metric, even if every visible invoice happens to share the same non-USD `DisplayCurrency`.

---

## 17. Currency Display Rules *(rewritten)*

- All primary invoice figures (line items, subtotal, total, and every dashboard aggregate) are USD and must render with an explicit currency indicator (e.g. `$` or `USD`) — don't assume the reader infers it.
- When a project's `DisplayCurrency` is not `USD`, its invoices show one additional figure: the manually-entered, locked `ConvertedTotal` in `ConvertedCurrency` — styled as secondary (§5, §15), never replacing or visually competing with the primary USD total.
- Never hardcode `$` as the only possible symbol in a shared component — use the actual currency code/symbol for whichever figure is being rendered (USD for primary figures, the project's `DisplayCurrency` for the converted-total line).

---

## 18. Responsive Behavior

Unchanged: breakpoints `640/768/1024/1280px`; `<1024px` sidebar → drawer; `<768px` `2fr/1fr` (including the three-panel AI-assist layout) collapses to a single column, with the AI-assist panel stacking below the form rather than beside it; invoice document padding `48px → 20px`; tables scroll horizontally.

---

## 19. Tailwind / shadcn Implementation Guidance

Unchanged in approach — the CSS-variables-vs-Tailwind-theme choice is still an open implementation decision, not mandated here. If Tailwind + shadcn is chosen:

```js
theme: {
  extend: {
    colors: {
      brand: { light: '#e0e7ff', DEFAULT: '#6366f1', hover: '#4f46e5' },
      status: {
        draft:   { bg: '#f1f5f9', text: '#475569' },
        sent:    { bg: '#fffbeb', text: '#b45309' },
        paid:    { bg: '#ecfdf5', text: '#047857' },
        void:    { bg: '#fff1f2', text: '#be123c' },
        overdue: { bg: '#fef2f2', text: '#b91c1c' },
      },
    },
    fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
    borderRadius: { sm: '6px', md: '10px', lg: '14px' },
  }
}
```

- `Button`: `variant="default"` → `.btn-primary`; `variant="outline"` → `.btn-secondary`; `size="sm"` → `.btn-sm`.
- `Badge`: two separate variants — `status` (5 fixed) and `tag` (neutral/brand only) — never share a prop enum.
- `Card`: shadcn `<Card>` primitives, override border to `border-slate-200/90`, shadow to the documented `shadow-sm`.
- **AI-assist panel**: build as its own component (not a shadcn primitive) — a `Card` containing a message list + `Textarea` + `Button`, per §14.
- Load fonts via `next/font/google`.
- Render currency using `Intl.NumberFormat(locale, { style: 'currency', currency })` for both the primary USD figures and the converted-total figure — never a hardcoded `$`.

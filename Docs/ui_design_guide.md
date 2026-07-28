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

- Light theme only for page content. Cool neutral canvas (`slate-50`) isolating pure white cards.
- A single restrained brand accent (indigo), never decorative.
- Two typefaces carry the hierarchy: geometric sans for UI text, monospace for anything numeric or identifier-shaped.
- Density over whitespace-for-its-own-sake — this is a daily-use admin tool.
- Every card, table, badge, and alert must support a real decision.

**Nav shell exception (M27, 2026-07-28):** the sidebar/topbar/bottom-tab-bar are deliberately dark navy (`#0f172a`), not white — see §3. This is a nav-chrome-only treatment, not a reintroduction of app-wide dark mode; every page's content area stays the light theme described above.

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

## 3. Navigation Structure — **superseded 2026-07-28 by M27's v2 redesign (`design_handoff_dashboard_v2/`)**

Full spec lives in `design_handoff_dashboard_v2/README.md` §1 — read that file, not this section, before touching `Sidebar.tsx`/`AppShell.tsx`. Summary for continuity:

- **Desktop (≥1024px)**: sidebar is now `240px` fixed, **dark navy `#0f172a`** (not white), full height, sticky. Logo row: 30×30px indigo square + white "Invoice App" wordmark. Nav items (Dashboard/Parties/Projects/Invoices/Settings): mono-glyph icon box + label; active = `rgba(99,102,241,0.2)` bg + `#a5b4fc` text; inactive = `#94a3b8` text. Footer: circular indigo avatar + name/email, top border.
- **Mobile (<1024px)**: the sidebar is **replaced entirely**, never just hidden — this fixes the prior behavior where it simply vanished below `768px`/`md` with nothing standing in for it, and formally supersedes the never-built "overlay drawer" plan below. A fixed `52px` dark top bar (logo + wordmark only) plus a fixed dark bottom tab bar (5 equal columns, one per nav item, mono glyph + label, same active/inactive color treatment as desktop) replace it. Main content gets top/bottom padding to clear both bars.
- Breakpoint stays **1024px** — unchanged from the prior plan, just a different mobile replacement (bottom tab bar, not a drawer).
- **Setup-alert indicator** (the small nav-item count badge originally planned here): still not built, superseded by the v2 design's dashboard-level Alert banner + Priority Feed (§16) as the actual "needs attention" surface instead.

---

## 4. Page Templates

| Template | Used by | Notes |
|---|---|---|
| **Dashboard** | Dashboard | See §16. |
| **List/Ledger** | Invoices list, Projects list, **Parties list (single unified roster — no role tabs, no role filter)** | Since `Party.Role` doesn't exist, the Parties page is one plain table, not a contractor/client split. **Invoices/Projects specifically redesigned by M27 (2026-07-28)** — status/type filter chip row above the list, and a mobile (<1024px) stacked-card variant replacing the table entirely rather than a horizontally-scrolled squeeze; see `design_handoff_dashboard_v2/README.md` §3/§4 and §18 below. Parties list is unaffected — out of scope for M27. |
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

### Nav shell + dashboard-alert tokens *(new, M27 2026-07-28)*

| Token | Value | Usage |
|---|---|---|
| Nav-shell dark surface | `#0f172a` | Sidebar/mobile topbar/bottom-tab-bar background — reuses the existing `--text-primary` hex, not a new color. |
| Nav active tint | `rgba(99,102,241,0.2)` bg / `#a5b4fc` text | Active nav item on the dark surface only. |
| Dashboard alert-banner gradient | `linear-gradient(135deg, #1e1b4b, #312e81)` | Background of the new Alert banner (§16) only — not used anywhere else. |

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

Unchanged in structure from the prior version — two distinct treatments, same base shape, different palettes. **As built**, both are the shadcn `Badge` primitive styled per the palettes below — there is no separate hand-built `Tag` component; "Status Badge" and "Tag" below describe two *stylings* of `Badge`, not two components.

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
- **Settings entry point**: a small `.btn-secondary.btn-sm` "Configure" affordance in the panel header links directly into the real `/settings` page — a DB-backed, editable provider/model/key configuration UI (M16, `Docs/implementation_decisions.md` §22 addendum), reversing this guide's original read-only/env-var-sourced framing (`Docs/mvp_user_stories.md` Story 11.4 describes the superseded original decision). Kept out of the main form flow entirely — no inline settings editing on the form pages themselves.

---

## 15. Invoice Preview Layout — **superseded 2026-07-10 by `Docs/invoice_design_guidelines.md`**

The invoice document's layout/typography/color spec now lives entirely in **`Docs/invoice_design_guidelines.md`** — read that file, not this section, before touching `InvoiceDocument.tsx` or its CSS module. Summary of what changed and why, for continuity:

This section originally described (M7) an abstract "2×2 address grid" card look, then (same day) a letterhead redesign matching reference invoices while keeping the app's Docketly Indigo/Inter+mono system, then a further pass matching the reference's exact color/Arial font too. All of that is now superseded by a full print-first reproduction pass done directly against `Docs/invoice_design_guidelines.md` (a detailed mm/pt spec written against the reference invoice images) — the invoice document is a **fixed A4 page** (`210mm × 297mm`, `15mm` padding) using `mm`/`pt` units throughout via `src/components/invoice/InvoiceDocument.module.css`, not Tailwind's px-based utility system. There is no bordered/rounded "card" framing in either context anymore (no `framed` prop) — the in-app preview at `/invoices/[id]` and the bare `/invoices/[id]/print` route (the literal future PDF page, M9) render the exact same component with the exact same styling, per that guideline's explicit "preview and PDF must be visually identical" requirement.

Key structural notes still relevant:
- The status indicator is a small, subtle marker in the metadata block (not a colored pill beside the "Invoice" title) — rendered locally in `InvoiceDocument.tsx` via `deriveDisplayStatus`, not the shared `StatusBadge` component (which is unchanged and still used as-is in the invoice list/page header).
- The payment section heading is the reference's literal copy, "Payment to be made to:", not "Payment Details".
- Still no schema fields for the reference's optional per-invoice description/work-period note — intentionally omitted, same reasoning as before (would be a schema decision, not a layout one).
- `LockedBanner` (unchanged, see below) still renders above the A4 page for `SENT`/`PAID`/`VOID`.

**Locked state**: when status is `SENT`, `PAID`, or `VOID`, render a read-only banner above the document:

```
.doc-lock-banner { display:flex; align-items:center; gap:8px; background: var(--bg-main); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 10px 16px; font-size: 11px; color: var(--text-secondary); margin-bottom: 16px; }
```

Copy: "This invoice is locked. Line items, snapshots, and totals can no longer be edited." No edit controls render at all in this state.

---

## 16. Dashboard Design Rules — **superseded 2026-07-28 by M27's v2 redesign (`design_handoff_dashboard_v2/`)**

Full spec lives in `design_handoff_dashboard_v2/README.md` §2 — read that file, not this section, before touching `src/app/page.tsx`. Summary for continuity, plus the decisions made when scoping this as `Docs/feedback_backlog.md` M27 (2026-07-28):

- **Stats row** — still counts, not a revenue ticker, and still exactly the same four: **Active Projects**, **Draft Invoices**, **Sent/Unpaid Invoices** (+ USD subtext, unchanged from §17), **Overdue Invoices**. New in v2: each card also gets a trend indicator (▲/▼/– + delta since ~30 days ago) and a small 5-bar sparkline, both colored green/red/grey (reusing the existing paid/overdue/muted tokens — no new hex values). **These deltas are approximated**, not exact — there's no history/audit table in the schema (statuses are derived live, not snapshotted over time), so this is explicitly not a make-or-break feature at this stage, ship the approximation rather than building new history infrastructure for it.
- **New: Alert banner** — a full-width gradient card (`linear-gradient(135deg, #1e1b4b, #312e81)`, new token, alert-banner-only) above the stats row, rendered only when at least one Priority Feed item requires action (overdue invoice, setup gap, or stale draft — plain "activity" entries don't count). Omitted entirely when empty, never shown greyed/empty.
- **Replaces the old two-panel "Needs Attention" + "Recent Activity" split with one merged Priority Feed** — a single urgency-sorted list: overdue invoices first, then setup gaps (project missing a preferred payment method), then stale drafts, then recent lifecycle activity (sent/paid/voided/created) chronologically. Independently scrollable past `max-height: 520px` rather than growing the page.
- **"Stale draft" threshold is N=1 day**, implemented as a single named constant (not scattered literals) so it's changeable later without a design decision.
- `VOID` invoices excluded from every dashboard count and total (unchanged).
- **Currency rule unchanged from §17**: every dashboard figure is USD; a non-USD `SINGLE`-currency project's figures get their own per-currency breakdown line, never blended into the primary USD figure.
- **Explicitly out of scope for M27** (not in the v2 design, still open future candidates if ever wanted): per-project/per-client outstanding-balance breakdowns, and aging buckets (0-30/31-60/60+ days) in place of the single flat Overdue count.
- **M21 ("Alerts") is folded into this** — the Alert banner + Priority Feed above is considered to fully satisfy that item's "what needs attention" scope as a computed-on-load surface; M21's original richer "recurring schedule + notification delivery" framing was not carried forward and remains unbuilt. See `Docs/feedback_backlog.md`'s M21/M27 sections.

---

## 17. Currency Display Rules *(rewritten)*

- All primary invoice figures (line items, subtotal, total, and every dashboard aggregate) are USD and must render with an explicit currency indicator (e.g. `$` or `USD`) — don't assume the reader infers it.
- When a project's `DisplayCurrency` is not `USD`, its invoices show one additional figure: the manually-entered, locked `ConvertedTotal` in `ConvertedCurrency` — styled as secondary (§5, §15), never replacing or visually competing with the primary USD total.
- Never hardcode `$` as the only possible symbol in a shared component — use the actual currency code/symbol for whichever figure is being rendered (USD for primary figures, the project's `DisplayCurrency` for the converted-total line).

---

## 18. Responsive Behavior

Breakpoints `640/768/1024/1280px`, unchanged. `<768px` `2fr/1fr` (including the three-panel AI-assist layout) collapses to a single column, with the AI-assist panel stacking below the form rather than beside it; invoice document padding `48px → 20px` — both unchanged.

**Updated by M27 (2026-07-28)**, superseding the two bullets below:
- `<1024px` sidebar → **replaced by a dark top bar + bottom tab bar** (§3), not an overlay drawer (the drawer was planned but never built; this formally replaces that plan).
- **Invoices/Projects tables specifically** (§4) → **stacked cards** below `1024px`, not horizontal scroll. Every other table in the app (Parties list, etc.) keeps the unchanged horizontal-scroll behavior — this stacked-card treatment is scoped to the two redesigned list pages only.

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

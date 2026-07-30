# UI Design Guide

The application-chrome design system: tokens, components, page templates, and responsive rules. Two companion documents carve out their own territory: `Docs/invoice_design_guidelines.md` owns the invoice document itself (§15 below), and `design_handoff_dashboard_v2/README.md` is the authoritative pixel-level spec for the nav shell and the Dashboard/Invoices/Projects pages (§3/§4/§16 below summarize it).

---

## 1. Overall Visual Direction

**Docketly Indigo** — a Swiss-influenced, high-density operational workspace, not a marketing-style SaaS dashboard:

- Light theme for page content. Cool neutral canvas (`slate-50`) isolating pure white cards.
- A single restrained brand accent (indigo), never decorative.
- Two typefaces carry the hierarchy: geometric sans for UI text, monospace for anything numeric or identifier-shaped.
- Density over whitespace-for-its-own-sake — this is a daily-use admin tool.
- Every card, table, badge, and alert must support a real decision.

**Nav shell exception:** the sidebar/topbar/bottom-tab-bar are deliberately dark navy (`#0f172a`), not white — see §3. This is a nav-chrome-only treatment, not app-wide dark mode; every page's content area stays the light theme described above.

---

## 2. Layout System

- **Dual-frame canvas**: fixed-width dark left sidebar (desktop) + fluid main stage, `max-width: 1200px`, `padding: 40px` desktop / `16px` mobile.
- **Asymmetric grid**: `2fr/1fr` (`.layout-grid`) for primary content + supporting context. Single-column stacks use `.layout-single`.
- **Three-panel variant**: creation forms that include the AI-assist panel (§14) use a `2fr/1fr` split where the `1fr` slot is the assist panel instead of a generic "context" card — see §14 for when this applies.

```
┌──────────────┬────────────────────────────────────────────┐
│              │  page-header (title + primary action)       │
│   sidebar    ├────────────────────────────────────────────┤
│   240px      │  stats row (if applicable)                  │
│   fixed      ├───────────────────────────┬──────────────────┤
│   (dark)     │  primary panel (2fr)      │  context OR      │
│              │  (form / table)           │  AI-assist (1fr) │
└──────────────┴───────────────────────────┴──────────────────┘
```

---

## 3. Navigation Structure

Full spec in `design_handoff_dashboard_v2/README.md` §1 — read that file before touching `Sidebar.tsx`/`MobileNav.tsx`/`AppShell.tsx`. Summary:

- **Desktop (≥1024px)**: `240px` fixed sidebar, **dark navy `#0f172a`**, full height, sticky. Logo row: 30×30px indigo square + white "Invoice App" wordmark. Nav items (Dashboard/Parties/Projects/Invoices/Settings): icon box + label; active = `rgba(99,102,241,0.2)` bg + `#a5b4fc` text; inactive = `#94a3b8` text. Footer: circular indigo avatar + name/email, top border.
- **Mobile (<1024px)**: the sidebar is **replaced entirely**, never just hidden. A fixed `52px` dark top bar (logo + wordmark only — no hamburger) plus a fixed dark bottom tab bar (5 equal columns, one per nav item, icon above a 10px label, same active/inactive color treatment as desktop). Main content gets top/bottom padding to clear both fixed bars.
- Breakpoint: **1024px**.
- **Alerts bell**: a badge-counted bell icon in the logo row (desktop sidebar) and the mobile top bar — the one nav-item indicator that does exist, visible from every page, not just the dashboard. Click opens a popover panel listing each fired `ProjectAlertSchedule` with an inline Clear button. The dashboard-level Alert banner + Priority Feed (§16) covers overdue invoices, setup gaps, and stale drafts only; fired alerts are deliberately not part of either (see §16). The Projects list (§9) additionally shows a small bell-dot next to the name of any project with a fired alert.

---

## 4. Page Templates

| Template | Used by | Notes |
|---|---|---|
| **Dashboard** | Dashboard | See §16. |
| **List/Ledger** | Invoices list, Projects list, **Parties list (single unified roster — no role tabs, no role filter)** | Since `Party.Role` doesn't exist, the Parties page is one plain table, not a contractor/client split. **Invoices/Projects** additionally get a status filter chip row above the list and a mobile (<1024px) stacked-card variant replacing the table entirely — see `design_handoff_dashboard_v2/README.md` §3/§4 and §18 below. The Parties list keeps the plain light table treatment (§9). |
| **Form/Detail — with AI assist** | Create Party, Add Payment Method, Create/Edit Draft Invoice | Uses the three-panel layout (§2/§14): form on the left, AI-assist chat on the right. |
| **Form/Detail — no AI assist** | Create/Edit Project | Uses the plain `2fr/1fr` layout: form left, a normal supporting-info card right (e.g. existing project list) — **never an AI-assist panel here**, by explicit decision. Contractor/Client pickers each need an inline "+ Create new party" affordance for when the list is empty. |
| **Document Preview** | Invoice detail/preview | See §15. Must support both editable (`DRAFT`) and locked (`SENT`/`PAID`/`VOID`) states. |

---

## 5. Typography

| Role | Size | Weight | Tracking | Color |
|---|---|---|---|---|
| Page title (`h1`) | 24px | 800 | -0.02em | text-primary |
| Page subtitle | 13px | 400 | normal | text-secondary |
| Card/section title | 15px | 700 | normal | text-primary |
| Body / table cell | 13px | 400–600 | normal | text-primary / text-secondary |
| Form label | 11px | 700 | 0.05em, uppercase | text-secondary |
| Table header | 11px | 700 | 0.05em, uppercase | text-secondary |
| Stat value | 28px | 700 | normal | text-primary, **mono** |
| Badge/tag text | 10px | 700 | uppercase | per-variant |
| Invoice doc ID | 20px | 800 | normal | brand, mono |
| Invoice grand total | 18px | 800 | normal | text-primary, mono |
| Converted-total figure | 13px | 700 | normal | text-secondary, mono — deliberately smaller/quieter than the primary total so it reads as secondary information, never competing with it. |

Sans = Inter, Mono = JetBrains Mono, loaded via `next/font`.

---

## 6. Spacing Scale

Stage padding 40/16px, card padding 24px (body)/20×24px (header), row-section gap 32px, panel gap 24px, form-field gap 16px, inline-control gap 8–12px.

---

## 7. Color Tokens

| Token | Hex | Tailwind equivalent | Usage |
|---|---|---|---|
| `--color-brand` | `#6366f1` | indigo-500 | Primary actions, active state, invoice ID |
| `--color-brand-hover` | `#4f46e5` | indigo-600 | Primary button hover |
| `--color-brand-light` | `#e0e7ff` | indigo-100 | Active-tag bg, default-method tag, date chips |
| `--bg-main` | `#f8fafc` | slate-50 | App canvas |
| `--bg-card` | `#ffffff` | white | Cards, light tables |
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

### Nav shell + dashboard-alert tokens

| Token | Value | Usage |
|---|---|---|
| Nav-shell dark surface | `#0f172a` | Sidebar/mobile topbar/bottom-tab-bar background, and the Invoices/Projects table header rows — reuses the `--text-primary` hex, not a new color. |
| Nav active tint | `rgba(99,102,241,0.2)` bg / `#a5b4fc` text | Active nav item on the dark surface only. |
| Dashboard alert-banner gradient | `linear-gradient(135deg, #1e1b4b, #312e81)` | Background of the Alert banner (§16) only — not used anywhere else. |

### Semantic (validation/alert) tokens

| Token | Background | Border | Text |
|---|---|---|---|
| `--alert-info-bg` | `#f8fafc` | border-light | text-secondary |
| `--alert-warning-bg` | `#fffbeb` | `#fde68a` | `#92400e` |
| `--alert-error-bg` | `#fef2f2` | `#fecaca` | `#b91c1c` |
| `--alert-success-bg` | `#ecfdf5` | `#a7f3d0` | `#047857` |

---

## 8. Card Style & Buttons

White card, `1px solid border-light`, `10px` radius, `shadow: 0 1px 2px rgba(0,0,0,0.05)`; header `20px 24px` + bottom border; body `24px`.

| Variant | Style | Hover |
|---|---|---|
| `.btn-primary` | Solid brand bg, white text, semibold | brand-hover bg |
| `.btn-secondary` | White bg, border-light, secondary text | bg-main tint |
| `.btn-sm` | `font-size: 11px; padding: 4px 10px;` combine with primary/secondary | same as base |

---

## 9. Table Style

Two table treatments exist:

- **Light table** (Parties list, embedded sub-lists, any generic `DataTable` usage): `.table-container` wrapper, header `14px 20px` padding/`#f8fafc` bg/`11px` bold uppercase, body cell `16px 20px`/`13px`, row hover tint, numeric/ID columns in mono, right-aligned amounts.
- **Dark-header grid table** (top-level Invoices and Projects lists only): header row on the nav-shell dark surface (`#0f172a`, `#94a3b8` uppercase text), body rows as full-row links with a trailing chevron — full column specs in `design_handoff_dashboard_v2/README.md` §3/§4. Below `1024px` these two lists render as stacked cards instead (§18).

**Parties table specifically**: one column set for everyone — no role column, no role-based badge. `Type` (`INDIVIDUAL`/`ORGANIZATION`) may appear as a neutral Tag (§11) if useful, but it's informational only, never a filter axis.

Every list needs a defined empty state (§12) for zero rows.

---

## 10. Form Style

`.form-group` column flex, `6px` gap, `16px` bottom margin; label `11px` bold uppercase; input/select `36px` height, `border-heavy`, `13px`, `8px` radius; focus → brand border **plus a visible focus ring** (`2px` brand at 30% opacity — border-color change alone isn't sufficient for keyboard accessibility). Required fields marked `*`.

**Relational pickers (Contractor, Client, Project, Payment Method)**: standard `.form-select`, each optionally paired with an inline "+ Create new [entity]" link/button directly beneath or beside it when the list might be empty (Project form's Contractor/Client pickers — see §4).

See §13 for the error state.

---

## 11. Status Badges & Tags

Two distinct treatments, same base shape, different palettes. Both are the shadcn `Badge` primitive styled per the palettes below — there is no separate hand-built `Tag` component; "Status Badge" and "Tag" describe two *stylings* of `Badge`, not two components.

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

```
.empty-state       { display:flex; flex-direction:column; align-items:center; text-align:center; padding: 48px 24px; gap: 8px; }
.empty-state-icon  { width:48px; height:48px; border-radius:50%; background: var(--bg-main); display:flex; align-items:center; justify-content:center; color: var(--text-muted); }
.empty-state-title { font-size:13px; font-weight:700; color: var(--text-primary); }
.empty-state-desc  { font-size:11px; color: var(--text-muted); max-width: 280px; }
```

Applies to: "No parties yet" → "Create your first party"; "No payment methods" → "Add a payment method"; "No projects yet" → "Create your first project" (shown at the mandatory project-picker gate on Create Invoice, §4); "No invoices yet" → "Create your first invoice."

---

## 13. Validation States

```
.form-input.is-error, .form-select.is-error { border-color: #dc2626; }
.form-error-text { font-size: 11px; color: #b91c1c; margin-top: 4px; }

.alert           { border-radius: var(--radius-sm); border: 1px solid; padding: 12px 16px; font-size: 11px; line-height: 1.4; }
.alert-info      { background: var(--alert-info-bg); border-color: var(--border-light); color: var(--text-secondary); }
.alert-warning   { background: var(--alert-warning-bg); border-color: #fde68a; color: #92400e; }
.alert-error     { background: var(--alert-error-bg); border-color: #fecaca; color: #b91c1c; }
.alert-success   { background: var(--alert-success-bg); border-color: #a7f3d0; color: #047857; }
```

`alert-warning` for "missing preferred payment method" / "no line items yet"; `alert-error` for the blocked-send validation checklist (due date on/after issue date, converted total required for a `DUAL`-mode project, at least one line item, etc.); `alert-success` for confirmations.

---

## 14. AI-Assist Panel

A persistent right-hand panel (`1fr` slot in the three-panel layout, §2) alongside the **Party**, **Payment Method**, and **Invoice** forms only — **never on the Project form**.

- **Structure**: a card (`.card`) titled "AI Assist" (or similar), containing a scrollable message/prompt history area and a bottom-anchored text input + send button — a standard chat-panel shape, not a novel widget.
- **Behavior signal**: after a prompt is processed, the corresponding form fields visibly populate/highlight briefly (e.g. a momentary `brand-light` background flash on the affected fields) so the admin can see exactly what changed before reviewing and submitting — the panel never submits the form itself.
- **Absence is normal, not broken**: when unconfigured or failing, the panel either doesn't render at all or shows a quiet, low-emphasis empty state (not an `alert-error`) — this is a progressive enhancement, not a required part of the page. The form itself never indicates anything is "missing."
- **Settings entry point**: a small "Configure" affordance in the panel header links directly into the `/settings` page — the DB-backed provider/model/key configuration UI (`Docs/implementation_decisions.md` §19). Kept out of the main form flow entirely — no inline settings editing on the form pages themselves.

---

## 15. Invoice Preview Layout — owned by `Docs/invoice_design_guidelines.md`

The invoice document's layout/typography/color spec lives entirely in **`Docs/invoice_design_guidelines.md`** — read that file, not this section, before touching `InvoiceDocument.tsx` or its CSS module. App-chrome facts that live on this side of the boundary:

- The invoice document is a **fixed A4 page** (`210mm × 297mm`, `15mm` padding) using `mm`/`pt` units throughout via its own CSS module — not the px-based token system in this guide. No bordered/rounded "card" framing in any context.
- The in-app preview at `/invoices/[id]` and the bare `/invoices/[id]/print` route (the exact page the PDF is generated from) render the same component with the same styling — preview and PDF must be visually identical.
- The document's status indicator is a small, subtle marker in its metadata block, rendered locally within the document component — not the shared `StatusBadge` (§11), which is used in lists/page headers only.
- The payment section heading is the literal copy "Payment to be made to:", not "Payment Details".

**Locked state**: when status is `SENT`, `PAID`, or `VOID`, render a read-only banner above the document (hidden in print output):

```
.doc-lock-banner { display:flex; align-items:center; gap:8px; background: var(--bg-main); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 10px 16px; font-size: 11px; color: var(--text-secondary); margin-bottom: 16px; }
```

Copy: "This invoice is locked. Line items, snapshots, and totals can no longer be edited." No edit controls render at all in this state.

---

## 16. Dashboard Design Rules

Full spec in `design_handoff_dashboard_v2/README.md` §2 — read that file before touching `src/app/page.tsx`. Summary:

- **Stats row** — counts, not a revenue ticker: **Active Projects**, **Draft Invoices**, **Sent/Unpaid Invoices** (+ outstanding-amount subtext per §17), **Overdue Invoices**. Every card fills the full height of its grid row (so all four stay the same height regardless of content) and carries a small 5-bar sparkline, colored green/red/grey by whether the trailing-~30-day direction is favorable for that metric (reusing the paid/overdue/muted tokens — no new hex values; no arrow/delta text is rendered alongside it). A card's subtext is capped at one line — Sent/Unpaid's per-currency breakdown and Overdue's per-project listing both show only the first entry, with any remainder behind a "+N more" popover chip, so a variable-length subtext can never grow a card taller than its siblings. **Sparkline deltas are approximations** computed from existing `createdAt`/`updatedAt` timestamps — there is no history/audit table, and building one for this feature was deliberately rejected.
- **Alert banner** — a full-width gradient card (§7's alert-banner gradient) above the stats row, rendered only when at least one Priority Feed item requires action (overdue invoice, setup gap, or stale draft — plain "activity" entries don't count; fired alerts are surfaced separately, via the nav bell, §3). Omitted entirely when empty, never shown greyed-out.
- **Priority Feed** — one merged, urgency-sorted list (not separate "needs attention" and "activity" panels): overdue invoices first, then setup gaps (project missing a preferred payment method), then stale drafts, then recent lifecycle activity (sent/paid/voided/created) chronologically. Independently scrollable past `max-height: 520px` rather than growing the page.
- **"Stale draft" threshold is 1 day**, implemented as a single named constant (`STALE_DRAFT_DAYS`) so it's changeable without touching multiple call sites.
- `VOID` invoices are excluded from every dashboard count and total.
- **Currency rule per §17**: the primary outstanding figure sums USD-denominated invoices only; each non-USD currency present gets its own per-currency breakdown line, never blended into the USD figure.

---

## 17. Currency Display Rules

- Every rendered amount uses the invoice's own denominated currency (`Invoice.Currency` — `Docs/implementation_decisions.md` §17) with an explicit currency indicator — don't assume the reader infers it.
- For a `DUAL`-mode project's invoices, one additional figure appears: the manually-entered, locked `ConvertedTotal` in `ConvertedCurrency` — styled as secondary (§5, §15), never replacing or visually competing with the primary total.
- Never hardcode `$` (or any single symbol) in a shared component — use the actual currency code/symbol for whichever figure is being rendered.
- Dashboard aggregates never blend currencies — see §16.

---

## 18. Responsive Behavior

Breakpoints `640/768/1024/1280px`.

- `<1024px`: the sidebar is replaced by the dark top bar + bottom tab bar (§3).
- `<1024px`: the top-level **Invoices/Projects** tables render as stacked cards (§4/§9). Every other table (Parties list, etc.) keeps horizontal scroll.
- `<768px`: `2fr/1fr` layouts (including the three-panel AI-assist layout) collapse to a single column, with the AI-assist panel stacking below the form rather than beside it.
- Invoice document padding `48px → 20px` on small screens (preview context only — print/PDF output is always the fixed A4 geometry, §15).

---

## 19. Tailwind / shadcn Implementation Guidance

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
- Render currency using `Intl.NumberFormat(locale, { style: 'currency', currency })` with the actual currency being displayed — never a hardcoded `$`.

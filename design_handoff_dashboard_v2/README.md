# Handoff: Invoice App UI Redesign (Concept B / "v2")

## Overview

A UI redesign of the invoice application's Dashboard, Invoices, and Projects pages, plus a new responsive navigation shell (dark desktop sidebar + mobile bottom tab bar). Solves three problems in the current app: a plain/flat dashboard, a boring "Needs Attention" list, and zero mobile support (the sidebar currently just disappears below 1024px with nothing replacing it).

## About the Design Files

The file in this bundle (`Dashboard Redesign v2.dc.html`) is a **design reference built in HTML** — an interactive prototype showing intended layout, styling, states, and behavior. It is not production code to copy directly. The task is to **recreate this design in the app's existing Next.js/React + Tailwind codebase**, using its established component patterns (see `src/components/ui/*`, `src/components/layout/*`) rather than porting the HTML/inline-styles as-is.

The prototype file is self-contained (uses a lightweight templating runtime for live preview) — treat it as a visual/behavioral spec, not a library to import.

## Fidelity

**High-fidelity.** Colors, type scale, spacing, and component states below are final — implement pixel-for-pixel. Copy/labels are representative sample data; wire up real data from existing services (`projectService`, invoice repository, etc.).

## Screens / Views

### 1. Navigation shell (all pages)

**Desktop (≥1024px):**

- Fixed-width 240px sidebar, background `#0f172a` (near-black navy), full height, sticky.
- Logo row: 30×30px indigo (`#6366f1`) square, 8px radius, white "I" mark + "Invoice App" wordmark, 14px/700 white text, left-aligned; trailing right: alerts bell (30×30px, `rgba(99,102,241,0.2)` bg, `#a5b4fc` icon), badge (red, white count text) shown only when count > 0. Padding 22px 20px, `space-between`. Click opens a popover panel (right side, 320px wide) listing each fired alert with an inline Clear button.
- Nav items: vertical stack, 3px gap, 12px horizontal padding container. Each item: 9px 12px padding, 8px radius, flex row, 10px gap.
  - Icon: 20×20px box, 6px radius, mono letter glyph, JetBrains Mono 10px/700.
  - **Active state**: item bg `rgba(99,102,241,0.2)`, text `#a5b4fc`, icon box bg `#6366f1` (white glyph).
  - **Inactive**: transparent bg, text `#94a3b8`, icon box bg `rgba(255,255,255,0.08)` (`#94a3b8` glyph).
  - Items: Dashboard (D), Parties (P), Projects (J), Invoices (I), Settings (S).
- Footer: user row, 30×30px circular indigo avatar, name (12px/600 white) + email (11px `#64748b`), top border `rgba(255,255,255,0.08)`.

**Mobile (<1024px):**

- Sidebar is replaced entirely (never just hidden).
- Top bar: fixed, 52px tall, full width, bg `#0f172a`, `space-between`. Logo (26×26px) + wordmark on the left — no hamburger, no page title needed here; alerts bell (26×26px, same badge treatment as desktop) trailing on the right.
- Bottom tab bar: fixed to viewport bottom, bg `#0f172a`, `display:grid` 5 equal columns, padding `6px 4px 10px` (extra bottom padding for home-indicator safe area). One tab per nav item: mono glyph letter above a 10px/600 label. Active tab text `#a5b4fc`; inactive `#64748b`.
- Main content gets `padding-top: 52px; padding-bottom: 64px;` to clear both fixed bars.
- Breakpoint: **1024px** (matches current app's existing sidebar collapse point — don't change it, just add the mobile replacement).

### 2. Dashboard

Layout: content max-width 1200px, centered, padding 40px desktop / 16-20px mobile.

- **Header row**: flex, space-between, wraps on mobile. Title "Dashboard" 24px/800/`-0.02em` tracking, `#0f172a`. Subtitle 13px `#475569`. Right-aligned primary button: "+ New Invoice", 36px tall, 16px horizontal padding, 8px radius, bg `#6366f1`, white 13px/600 text, no border.

- **Alert banner** (new — doesn't exist in current app): only rendered when there are items needing attention. Full-width card, 14px radius, `linear-gradient(135deg, #1e1b4b, #312e81)` background, white text, padding 20px 22px, flex row space-between (wraps on mobile).
  - Left: eyebrow "ATTENTION NEEDED" (11px/700/uppercase/`0.08em` tracking, color `#a5b4fc`) above a 15px/700 headline, e.g. "2 items need review before month-end."
  - Right: pill chips per alert, `rgba(255,255,255,0.12)` bg, 999px radius, 6px/12px padding, 12px/600 white text, each linking to the relevant filtered view.
  - Empty state: banner is omitted entirely (not shown empty/greyed).

- **Stat cards**: grid, 4 columns desktop / 1 column mobile, 16px gap, `align-items: stretch` (the grid default) — each card fills the full height of its row via `height: 100%`, so all four stay the same height regardless of content. Each card: white bg, 1px `#e2e8f0` border, 12px radius, 16px padding, column layout, 10px gap.
  - Top row: label only (11px/700/uppercase/`0.05em`, `#94a3b8`) — no trend arrow/delta text.
  - Value row: big number (JetBrains Mono, 28px/700, `#0f172a`) left, **5-bar sparkline** right (4px-wide bars, 2px radius, height 0-100% scaled, colored by trend tone — green `#047857` favorable, red `#b91c1c` unfavorable, grey `#94a3b8` neutral — 55% opacity, 3px gap, 24px tall container).
  - Optional subtext line below (11px, `#475569`, mono), pinned to the bottom of the card (`margin-top: auto`) — used for money amounts like "$18,450.00 outstanding". Capped at one entry: any remainder (e.g. additional non-USD currencies, or additional overdue projects) renders behind a "+N more" pill that opens a small popover listing the rest, rather than stacking indefinitely and growing the card taller than its siblings.
  - Cards: Active Projects, Draft Invoices, Sent/Unpaid (+ $ outstanding subtext, +N more currencies), Overdue Invoices (+ most-urgent project name, +N more projects).
  - Sparkline data should reflect real trailing-30-day deltas once wired to real data; the current values are placeholders.

- **Priority Feed** (new — replaces the old separate "Needs Attention" list + "Recent Activity" log with one merged, urgency-ordered list): white card, 1px `#e2e8f0` border, 12px radius.
  - Header: "Priority Feed" (15px/700) left, "Most urgent first" (11px `#94a3b8`) right, bottom border `#e2e8f0`, 18px/20px padding.
  - Rows: each is a link, flex row, 12px gap, top border `#f1f5f9` between rows (no border on first). Left edge: 3px-wide colored bar (self-stretch height) indicating urgency: red `#b91c1c` (overdue), amber `#b45309` (setup gap), slate `#475569` (draft), green `#047857`/indigo `#6366f1` (activity events).
    - Title (13px/600, `#0f172a`, truncates with ellipsis) + detail line (12px `#94a3b8`, truncates).
    - Optional right-aligned amount (JetBrains Mono, 13px/600).
    - Right-aligned category tag pill (10px/700/uppercase, colored bg at ~10% opacity of the bar color, text = bar color): "Overdue", "Setup", "Draft", "Activity".
  - Row content mixes: overdue invoices, missing-payment-setup projects, stale drafts, and recent lifecycle events (paid/sent/created/voided) — all in one urgency-sorted feed rather than split into two panels.
  - **Empty state**: centered, 48px green (`#ecfdf5` bg / `#047857` icon) checkmark circle, "All caught up" (13px/700), helper text "No overdue invoices, drafts, activity, or setup gaps right now." (11px `#94a3b8`, max-width 260px).
  - **Long-list state**: feed becomes independently scrollable at `max-height: 520px`.

### 3. Invoices

- Same header pattern as Dashboard ("Invoices" title + "+ New Invoice" button).
- **Status filter chips** row above the list: All / Draft / Sent / Paid / Overdue / Void. Pill buttons, 999px radius, 6px/14px padding, 12px/600. Active: `#e0e7ff` bg, `#6366f1` text, `#6366f1` border. Inactive: white bg, `#475569` text, `#e2e8f0` border.
- **Desktop table** (≥1024px): white card, `#e2e8f0` border, 12px radius, overflow hidden. Header row: dark bg `#0f172a`, `#94a3b8` 11px/700/uppercase text, grid columns `1.1fr 1.3fr 1.3fr 0.9fr 0.9fr 0.9fr 0.3fr` (Invoice, Client, Project, Amount, Due, Status, chevron). Body rows: same grid, 14px/20px padding, top border `#f1f5f9`, invoice number in JetBrains Mono/600, amount in JetBrains Mono, status as colored badge pill (see badge colors below), trailing `›` chevron in `#cbd5e1`.
- **Mobile (<1024px)**: table is replaced by stacked cards (not just squeezed) — one card per invoice: white bg, `#e2e8f0` border, 12px radius, 14px/16px padding. Row 1: invoice number (mono/700) + status badge. Row 2: client name (13px/600). Row 3: project (12px `#94a3b8`). Row 4 (top border `#f1f5f9`): due date left, amount right (mono/700).
- **Empty state**: centered document icon (grey circle), "No invoices yet" / "Create your first invoice."

### 4. Projects

Same structural pattern as Invoices:

- Filter chips: All / Active / Archived.
- **Desktop table** columns: `1.6fr 1.2fr 1fr 1.4fr 0.7fr 0.3fr` — Project (with a 28×28px indigo-tinted initials avatar, `#ede9fe` bg / `#6366f1` text, mono 2-letter abbreviation), Client, Status (badge), Payment Method, Currency (mono), chevron.
- Status badge: Active = `#e0e7ff` bg / `#6366f1` text; Archived = `#f1f5f9` bg / `#475569` text.
- Payment method column: shows the method (e.g. "ACH — Chase ••4821") in `#475569` 12px, OR, if unset, "No payment method" in amber `#92400e` 12px/600 — this is a **deliberate warning surface**, not neutral empty text; it's meant to prompt the user to complete setup.
- Project name cell: a small bell-dot icon (red, `#b91c1c`) appears immediately after the name when that project has a fired, uncleared alert schedule — same underlying data as the nav bell (§1).
- **Mobile**: stacked cards mirroring the same fields (avatar + name + status on row 1, client below, payment/currency on a bottom bordered row).
- **Empty state**: "No projects yet" / "Create your first project."

## Interactions & Behavior

- Nav item click → navigates to that page (client-side routing in the real app; Parties/Settings are present but not built out in this design pass — leave their existing routes untouched).
- Status filter chips → client-side (or query-param) filter of the underlying list; only one active at a time.
- Table/card rows are links to invoice/project detail (existing detail routes).
- No custom animations beyond standard link/button hover states — keep hover states consistent with the rest of the app (e.g. slight opacity or bg shift on buttons/rows).
- Long lists: Priority Feed panel scrolls independently past `max-height: 520px` rather than growing the page indefinitely.

## State Management

- Per-page: current status filter (Invoices, Projects) — simple local/URL state.
- Dashboard needs three real data aggregations to replace the mock arrays:
  1. Stat counts + trailing-30-day deltas (active projects, drafts, sent/unpaid + $ total, overdue).
  2. Priority Feed items: overdue invoices, drafts stale > N days, projects missing a payment method, and recent lifecycle activity — merged and sorted by urgency (overdue first, then setup gaps, then drafts, then activity chronologically).
  3. Alert banner headline: count of feed items requiring action (exclude plain "activity" entries) — shown only when count > 0.
- Mobile vs. desktop nav is a pure CSS/JS breakpoint check (1024px), no separate route.

## Design Tokens

**Colors**

- Ink: `#0f172a` (headings, primary text, dark sidebar/topbar/tab-bar/table-header bg)
- Body text: `#475569`
- Muted text: `#94a3b8`
- Faint text/border: `#64748b`, `#cbd5e1`
- Borders/dividers: `#e2e8f0` (cards), `#f1f5f9` (row dividers)
- Surface: `#ffffff`, App background: `#f8fafc`
- Brand indigo: `#6366f1` (primary actions, active states), light indigo `#e0e7ff`/`#ede9fe`, dark-mode active tint `rgba(99,102,241,0.2)`, dark-mode active text `#a5b4fc`
- Success/paid: bg `#ecfdf5`, text `#047857`
- Warning/setup: bg `#fffbeb`, text `#b45309`/`#92400e`
- Error/overdue: bg `#fef2f2`, text `#b91c1c`
- Void: bg `#fff1f2`, text `#be123c`
- Draft/neutral: bg `#f1f5f9`, text `#475569`
- Gradient (alert banner): `linear-gradient(135deg, #1e1b4b, #312e81)`

**Typography**

- UI font: Inter (400/500/600/700/800)
- Numeric/mono font: JetBrains Mono (500/600/700) — used for invoice numbers, currency amounts, stat values, currency codes, nav glyphs
- Page title: 24px/800, `-0.02em` letter-spacing
- Section/card title: 15px/700
- Body: 13px/400–600
- Label/eyebrow: 11px/700, uppercase, `0.05em`–`0.08em` letter-spacing
- Tag/badge text: 10px/700, uppercase, `0.04em` letter-spacing

**Spacing / radii**

- Card radius: 12px; pill/badge radius: 999px; small icon box radius: 6–8px; alert banner radius: 14px
- Card padding: 16–20px; page padding: 40px desktop / 16–20px mobile
- Grid gaps: 16px (stat cards), 20px (page sections), 8–10px (chip rows, mobile cards)

**Breakpoint**

- 1024px — matches the existing app's current sidebar collapse point.

## Assets

No external image assets. All icons are single-letter/glyph mono-type marks or Unicode symbols (▲ ▼ – for trends, › for chevrons, ✓ for empty-state success) — no icon library dependency was introduced. If the app already uses an icon library (e.g. Lucide, which is common in shadcn/ui setups), swap these glyphs for real icons of equivalent meaning.

## Files

- `Dashboard Redesign v2.dc.html` — the interactive HTML prototype (Concept B) covering Dashboard, Invoices, and Projects, with a top-right control panel to toggle page / desktop-mobile / normal-empty-long data states. Open it in a browser to click through every state described above.
- `screenshots/` — static captures of desktop Dashboard/Invoices/Projects, mobile Dashboard, and Empty/Long data states, for quick reference alongside the live prototype.

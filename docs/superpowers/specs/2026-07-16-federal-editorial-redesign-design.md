# Federal Editorial Redesign — Design Spec

**Date:** 2026-07-16
**Status:** Approved
**Scope:** Full visual redesign + layout/UX polish of the Civic Flash Cards PWA. Same views, same features, same data model.

## Goal

Replace the "Patriotic Brutalism" theme with a refined **Federal Editorial** aesthetic — inspired by fine government documents and archival print. The app should feel dignified and worthy of the citizenship moment: elegant, restrained, distinctly American without being loud.

The patriotic identity (navy / red / gold, civic Americana) survives. The brutalism (thick 2.5px borders, offset block shadows, electric colors, all-caps Oswald) does not.

## Design System

All tokens live in `:root` in `src/styles/index.css` (single stylesheet, Light DOM — unchanged architecture).

### Palette

| Token | Value (approx.) | Usage |
|-------|-----------------|-------|
| `--paper` | `#F7F3EA` | Page background, with barely-there grain texture (inline SVG noise, very low opacity) |
| `--surface` | `#FFFDF7` | Card / panel backgrounds (warm white) |
| `--ink` | `#1A2B4A` | Body text, icons, structure |
| `--navy` | `#20345C` | Primary actions, masthead, emphasis |
| `--red` | `#9E2B25` | Sparingly: key CTAs, "still learning", destructive actions |
| `--gold` | `#B08D3E` | "Foil seal" accent: mastery stars, active states, flourishes |
| `--hairline` | ink @ ~15% opacity | 1px borders, rules, dividers |

Exact hex values may be tuned during implementation for contrast (WCAG AA minimum for text), but stay in this register — muted, archival, warm.

**Category tints (A–H):** 8 muted archival tints (e.g. dusty blue, sage, clay, wheat, slate, moss, rose, parchment) replacing the current saturated `cat-A`–`cat-H` backgrounds. Each keeps a matching stronger tone for icons/badges (`cat-icon-A`–`cat-icon-H`). Class names unchanged.

### Typography

| Token | Font | Usage |
|-------|------|-------|
| `--font-display` | **Fraunces** (Google Fonts, optical sizing) | Headings, flashcard question/answer text, large numerals |
| `--font-body` | **Public Sans** (Google Fonts) | UI, body, buttons, labels |

- Eyebrow/section labels: Public Sans, uppercase, letterspaced (~0.08em), small — certificate-engraving feel.
- Numerals in stats use tabular figures where supported.
- Replaces Oswald + Barlow; `<link>` tags in `index.html` updated.

### Structure & Depth

- **Borders:** 1px hairlines (`--hairline`) replace `2.5px solid` brutalist borders.
- **Dividers:** double-rule (two stacked hairlines) under major headings, like certificates.
- **Shadows:** soft, diffuse, low-opacity (`--shadow-soft`), replacing offset block shadows. Most depth comes from hairlines + background contrast, not shadow.
- **Radius:** 6px on cards/inputs/buttons (subtle, not pill).
- **Spacing:** generous whitespace; consistent 4px-base scale.

### Iconography

Keep Material Icons Round (already loaded) — acceptable with the new system and avoids scope creep. May be revisited later.

## Layout & UX Changes

### Navigation consolidation

Today the topbar (Dashboard / Study Mode / All Cards) duplicates the sidebar (Home / Library / Stats / Settings). New structure:

- **Masthead (topbar):** slim — wordmark ("Civic Flash Cards" in Fraunces with a small gold star), keyboard-shortcuts button. No nav links.
- **Sidebar:** the single nav — Dashboard, Study, Library, Stats, Settings. "Study" links to the existing `#/study-launch` route (starts a daily session — current behavior, unchanged). Active state uses gold accent. "Reset Progress" moves out of the sidebar into Settings (it's a destructive action, not navigation).
- **Mobile:** existing drawer pattern kept, restyled.

### Per-view polish (same content, better composition)

- **Dashboard:** greeting + overall progress summary at top; session launchers as a refined "study plans" row; stats panel restyled as a ledger-like summary; mastery trend chart restyled with hairline axes. Remove filler copy ("Continue your mindful journey…"). The card-grid-with-filters section stays but is visually subordinate to the study plans.
- **Study mode:** flashcard is the hero — centered index-card/certificate hybrid, Fraunces question text, refined 3D flip, category eyebrow, elegant rating controls. Session stats sidebar becomes quieter.
- **Library:** cleaner search/filter bar; card tiles with muted category tints; **mastery displayed as 5 small gold stars** (replacing gray segments) — implemented inside the existing `mastery-bar` component/classes.
- **Stats:** same metrics, restyled — hairline-axis charts, ledger-style tables, gold accents for highlights.
- **Settings:** clean form styling; gains the Reset Progress action (with confirmation).

## Invariants (must not change)

- Views, routes, features, and data model
- Card IDs and `localStorage` keys (`civic_mastery`, `civic_sessions`, `civic_settings`)
- Light DOM Web Components; all styling in `src/styles/index.css`; no per-component CSS
- RxJS direct-import rules (`rxjs/internal/*`)
- Component public APIs, custom events, and lazy-loading/routing behavior
- PWA setup (manifest/service worker) — only `theme-color` and favicon colors update to match the new palette

## Verification

- `npm run build` (tsc + vite) passes
- Every view visually verified in the browser at desktop and mobile widths
- Study flow exercised end-to-end (launch session → flip → rate → complete)
- Keyboard shortcuts still work (nav keys, space to flip, 0–5 rating, F/M in library)
- Text contrast spot-checked against WCAG AA

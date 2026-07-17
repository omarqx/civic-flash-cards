# Federal Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Patriotic Brutalism" theme with the approved "Federal Editorial" design system — archival paper/ink palette, Fraunces + Public Sans, hairline structure, gold-foil accents — plus nav consolidation and per-view layout polish.

**Architecture:** All styling lives in a single global stylesheet (`src/styles/index.css`) consumed by Light-DOM Web Components. Task 1 rewrites the design tokens so legacy `var()` references instantly re-theme the whole app; later tasks rewrite each view's CSS section + component templates. No state, routing, or data changes.

**Tech Stack:** Vite 6, TypeScript 5 strict, vanilla Web Components (Light DOM), RxJS 7 (`rxjs/internal/*` imports only), vite-plugin-pwa.

**Visual source of truth:** `docs/superpowers/specs/2026-07-16-federal-editorial-mockup.html` (user-approved). Open it in a browser alongside the app while implementing. Spec: `docs/superpowers/specs/2026-07-16-federal-editorial-redesign-design.md`.

## Global Constraints

- Card IDs and `localStorage` keys (`civic_mastery`, `civic_sessions`, `civic_settings`) are immutable.
- Light DOM only; ALL CSS in `src/styles/index.css`; never create per-component CSS files.
- RxJS imports only from `rxjs/internal/*` sub-modules; never the `rxjs` barrel or `rxjs/operators`.
- Routes, custom events (`launch`, `card-click`, `rate`, `flip`, `study-card`, `close`), component properties/attributes, and lazy-loading behavior must not change. Exception approved by spec: sidebar gains a Study link to the existing `#/study-launch` route, and the sidebar Reset Progress button is removed (Settings already has one).
- Fonts: Fraunces (display) + Public Sans (body) via Google Fonts. Material Icons Round stays.
- Text contrast must meet WCAG AA (ink `#1A2B4A` on paper/surface passes; never place `--gold` text smaller than 14px bold on paper).
- **No test framework exists in this repo.** The test cycle for every task is: `npm run build` (tsc strict + vite) must pass, then visual verification in the browser at the listed route. Steps below say exactly what to look at. Dev server: `npm run dev` → http://localhost:5173/civic-flash-cards/.

## New Design Tokens (used by every task)

| Token | Value | Notes |
|---|---|---|
| `--paper` | `#F7F3EA` | page background |
| `--surface` | `#FFFDF7` | cards/panels |
| `--ink` | `#1A2B4A` | text |
| `--ink-soft` | `#4A5878` | secondary text |
| `--navy` | `#20345C` | primary actions, featured card |
| `--red` | `#9E2B25` | sparingly: still-learning, destructive |
| `--gold` | `#B08D3E` | foil accent |
| `--gold-soft` | `#C9AE6E` | quiet gold |
| `--hairline` | `rgba(26,43,74,0.16)` | 1px borders |
| `--hairline-soft` | `rgba(26,43,74,0.09)` | inner rules |
| `--shadow-soft` | `0 1px 2px rgba(26,43,74,0.05), 0 8px 24px -12px rgba(26,43,74,0.18)` | |
| `--font-display` | `'Fraunces', Georgia, serif` | |
| `--font-body` | `'Public Sans', system-ui, sans-serif` | |

Category tints (backgrounds / icon-strong colors), class names unchanged (`cat-A`…`cat-H`, `cat-icon-A`…`cat-icon-H`):

| Cat | bg | strong |
|---|---|---|
| A | `#E9EDF4` | `#46608F` |
| B | `#EAF0E6` | `#5A7350` |
| C | `#F5EAE2` | `#A05C3B` |
| D | `#F5EFDD` | `#8A6F2F` |
| E | `#E8ECEC` | `#4E6A6A` |
| F | `#EBEFE0` | `#6A7A42` |
| G | `#F5E7E6` | `#9E5A55` |
| H | `#F2EEE3` | `#8A7B4F` |

---

### Task 1: Fonts, tokens, base styles — global re-theme via token remap

**Files:**
- Modify: `index.html:15-19` (font links), `index.html:8` (theme-color), `index.html:13` (favicon)
- Modify: `src/styles/index.css:1-122` (header comment, tokens, base, skip-link)
- Modify: `vite.config.ts:43-44` (manifest colors)

**Interfaces:**
- Produces: every token in the table above, plus legacy aliases (`--bg`, `--black`, `--border`, `--shadow-brutal`, `--shadow-brutal-sm`, `--white`, and the gray scale) remapped to Federal Editorial values so untouched CSS instantly re-themes. Later tasks rely on these exact names.

- [ ] **Step 1: Swap fonts in `index.html`**

Replace the two Google Fonts `<link href=...>` lines (keep the Material Icons line and preconnects):

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Update `<meta name="theme-color" content="#002868">` → `content="#F7F3EA"`, and replace the inline SVG favicon with the new palette:

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%2320345C'/><text x='16' y='23' font-size='18' text-anchor='middle' fill='%23C9AE6E'>★</text></svg>">
```

- [ ] **Step 2: Replace the `:root` token block and base styles in `src/styles/index.css`**

Replace lines 1–122 (header comment through `.skip-link:focus`) with:

```css
/* ============================================================
   CIVIC FLASH CARDS — Federal Editorial Design System
   Archival paper & ink — USCIS Naturalization Test
   ============================================================ */

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  /* Core palette — archival document */
  --paper: #F7F3EA;
  --surface: #FFFDF7;
  --ink: #1A2B4A;
  --ink-soft: #4A5878;
  --navy: #20345C;
  --red: #9E2B25;
  --red-soft: #F5E7E6;
  --gold: #B08D3E;
  --gold-soft: #C9AE6E;
  --gold-tint: #F5EFDD;
  --green: #4C7A48;
  --green-tint: #EAF0E6;

  --hairline: rgba(26, 43, 74, 0.16);
  --hairline-soft: rgba(26, 43, 74, 0.09);
  --shadow-soft: 0 1px 2px rgba(26,43,74,0.05), 0 8px 24px -12px rgba(26,43,74,0.18);

  /* Legacy aliases — re-theme untouched rules; do not delete until final cleanup */
  --bg: var(--paper);
  --bg-dark: var(--navy);
  --white: var(--surface);
  --black: var(--ink);
  --border: 1px solid var(--hairline);
  --shadow-brutal: var(--shadow-soft);
  --shadow-brutal-sm: 0 1px 2px rgba(26,43,74,0.06);
  --red-light: #F5E7E6;
  --red-dark: #7E211C;
  --navy-light: #E9EDF4;
  --navy-mid: #46608F;
  --gold-light: #F5EFDD;
  --gold-bright: #B08D3E;
  --pink: var(--red);
  --pink-light: #F5E7E6;
  --yellow: var(--gold);
  --yellow-light: #F5EFDD;
  --green-light: #EAF0E6;
  --green-dark: #3E6338;
  --teal: #46608F;
  --teal-light: #E9EDF4;
  --blue: #46608F;
  --blue-light: #E9EDF4;
  --magenta: #7E211C;
  --magenta-light: #F5E7E6;
  --orange: #A05C3B;
  --orange-light: #F5EAE2;
  --gray-100: #F1EDE3;
  --gray-200: #E5E0D3;
  --gray-300: #C9C4B4;
  --gray-400: #8A93A8;
  --gray-500: #5A6680;
  --gray-600: #2E3A5C;

  /* Typography */
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Public Sans', system-ui, sans-serif;

  /* Spacing (unchanged) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px;
  --sp-6: 24px; --sp-8: 32px; --sp-10: 40px; --sp-12: 48px; --sp-16: 64px;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;

  --sidebar-width: 208px;
  --right-sidebar-width: 280px;
  --topbar-height: 56px;

  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --dur: 200ms;
}

html {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
}

body { min-height: 100dvh; overflow-x: hidden; }

/* Paper grain overlay */
body::before {
  content: '';
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 2000;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Shared editorial helpers */
.eyebrow {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--gold);
  display: flex; align-items: center; gap: 10px;
}
.double-rule {
  margin: var(--sp-5) 0 var(--sp-6);
  border-top: 1px solid var(--ink);
  position: relative; opacity: 0.85;
}
.double-rule::after {
  content: ''; position: absolute; left: 0; right: 0; top: 2px;
  border-top: 1px solid var(--hairline);
}
.stars-mastery { color: var(--gold); font-size: 0.85rem; letter-spacing: 0.18em; white-space: nowrap; }
.stars-mastery .off { color: rgba(26, 43, 74, 0.18); }

.skip-link {
  position: fixed; top: -100px; left: var(--sp-4); z-index: 9999;
  padding: var(--sp-2) var(--sp-4);
  background: var(--navy); color: var(--surface);
  font-weight: 700; font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase;
  border-radius: var(--radius-md);
  text-decoration: none; transition: top 150ms;
}
.skip-link:focus { top: var(--sp-4); }
```

- [ ] **Step 3: Sweep remaining Oswald-era styling defaults**

Still in `index.css`, run a search for `text-transform: uppercase` and `letter-spacing`. Rules using `--font-display` as loud uppercase headings will now render in Fraunces; uppercase serif looks wrong. Do NOT fix every view yet (later tasks rewrite those sections) — only fix global rules if any exist outside view sections (e.g., generic `h1`/`.btn`). For `.btn` (search `.btn {`), replace its font styling so buttons read as Public Sans:

```css
/* inside the existing .btn rule — replace font/border/shadow lines, keep layout lines */
font-family: var(--font-body);
font-size: 0.8rem;
font-weight: 700;
letter-spacing: 0.06em;
text-transform: uppercase;
border: 1px solid var(--hairline);
border-radius: var(--radius-md);
box-shadow: none;
```

And update its hover/active rules (search `.btn:hover`, `.btn:active`): replace brutalist translate/shadow-pop effects with:

```css
.btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-soft); }
.btn:active { transform: translateY(0); box-shadow: none; }
```

- [ ] **Step 4: Update PWA manifest colors in `vite.config.ts`**

```ts
theme_color: '#F7F3EA',
background_color: '#F7F3EA',
```

- [ ] **Step 5: Build + verify**

Run: `npm run build`
Expected: exits 0 (tsc + vite succeed).

Run dev server, open http://localhost:5173/civic-flash-cards/ and check: page background is warm ivory (not blue-white); headings render in a serif; body text in Public Sans; borders look thin, not chunky; no unstyled/black-on-black areas on Dashboard, Library, Stats, Settings, and Study (launch Daily Review). It will look half-finished — that's expected; only tokens changed.

- [ ] **Step 6: Commit**

```bash
git add index.html src/styles/index.css vite.config.ts
git commit -m "feat: Federal Editorial tokens, fonts, and base styles"
```

---

### Task 2: Masthead + single sidebar navigation

**Files:**
- Modify: `src/components/app/civic-topbar.ts` (drop nav links → masthead)
- Modify: `src/components/app/civic-sidebar.ts` (5 nav items incl. Study; remove Reset Progress; add footer motto)
- Modify: `src/styles/index.css` — replace the `TOP NAVIGATION BAR` section (`.topbar*` rules) and `LEFT SIDEBAR` section (`#sidebar`, `.nav-links`, `.nav-link*`, `.sidebar-footer`, `.sidebar-upgrade` rules); update the mobile nav rules (`.mobile-nav-toggle`, `.sidebar-overlay`) colors to tokens only.

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: masthead markup classes `.topbar`, `.topbar-brand`, `.topbar-brand-sub`, `.topbar-spacer`, `#btn-keyboard-help`; sidebar classes `.nav-links`, `.nav-link` (with `data-route` values `dashboard|study|library|stats|settings`), `.sidebar-motto`. `civic-app.ts` preloading (`[data-route]` hover) and nav-sync (`active-route` attribute → `.nav-link.active`) keep working unchanged because `data-route`/class names are preserved.

- [ ] **Step 1: Rewrite `civic-topbar.ts` render()**

Replace the `render()` body's `innerHTML` with (keep the shortcuts-modal click handler; delete the `<nav>` block and `updateActive` calls can stay — they just find zero `.topbar-link`s):

```ts
private render() {
  this.className = 'topbar';
  this.innerHTML = `
    <a href="#/dashboard" class="topbar-brand">Civic Flash Cards</a>
    <span class="topbar-brand-sub">USCIS Civics · 2025 Edition</span>
    <div class="topbar-spacer"></div>
    <button class="topbar-shortcuts" id="btn-keyboard-help" aria-label="Keyboard shortcuts">
      Shortcuts <kbd>?</kbd>
    </button>
  `;

  this.querySelector('#btn-keyboard-help')?.addEventListener('click', () => {
    const modal = document.getElementById('shortcuts-modal') as HTMLDialogElement | null;
    modal?.showModal();
  });
}
```

Also delete the now-dead `updateActive()` method and the `attributeChangedCallback` body can become `{}` — but keep `static observedAttributes` and the attribute API so `civic-app.setupNavSync()` doesn't break. Simplest safe form:

```ts
attributeChangedCallback() { /* masthead has no per-route state */ }
```

Remove the unused `import type { ViewName }` line if TypeScript flags it.

- [ ] **Step 2: Rewrite `civic-sidebar.ts` render()** — add Study link, drop Reset Progress

Replace `innerHTML` with:

```ts
this.innerHTML = `
  <ul class="nav-links" role="list">
    <li><a href="#/dashboard" class="nav-link" data-route="dashboard">
      <span class="material-icons-round">home</span><span>Dashboard</span></a></li>
    <li><a href="#/study-launch" class="nav-link" data-route="study">
      <span class="material-icons-round">style</span><span>Study</span></a></li>
    <li><a href="#/library" class="nav-link" data-route="library">
      <span class="material-icons-round">library_books</span><span>Library</span></a></li>
    <li><a href="#/stats" class="nav-link" data-route="stats">
      <span class="material-icons-round">bar_chart</span><span>Stats</span></a></li>
    <li><a href="#/settings" class="nav-link" data-route="settings">
      <span class="material-icons-round">settings</span><span>Settings</span></a></li>
  </ul>
  <div class="sidebar-motto">
    <span class="sidebar-motto-stars">★ ★ ★</span>
    E pluribus unum
  </div>
`;
```

Delete the `#btn-reset-progress` event listener block and the now-unused `Store`/`showToast` imports. Keep the mobile close-on-click block unchanged.

- [ ] **Step 3: Replace topbar + sidebar CSS sections in `index.css`**

Delete every `.topbar*` rule and every `#sidebar`/`.nav-links`/`.nav-link*`/`.sidebar-footer`/`.sidebar-upgrade` rule; insert:

```css
/* ============================================================
   MASTHEAD
   ============================================================ */
.topbar {
  position: sticky; top: 0; z-index: 200;
  background: var(--surface);
  border-bottom: 1px solid var(--hairline);
  height: var(--topbar-height);
  display: flex; align-items: center;
  padding: 0 var(--sp-6);
  gap: var(--sp-4);
}
.topbar::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 3px;
  height: 1px; background: var(--hairline-soft);
}
.topbar-brand {
  font-family: var(--font-display);
  font-weight: 600; font-size: 1.25rem; letter-spacing: 0.01em;
  color: var(--ink); text-decoration: none; white-space: nowrap;
  display: flex; align-items: center; gap: 10px;
}
.topbar-brand::before { content: '★'; color: var(--gold); font-size: 0.85rem; }
.topbar-brand-sub {
  font-size: 0.66rem; font-weight: 600; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-soft);
  border-left: 1px solid var(--hairline); padding-left: var(--sp-3);
  white-space: nowrap;
}
.topbar-spacer { flex: 1; }
.topbar-shortcuts {
  font-family: var(--font-body); font-size: 0.75rem; font-weight: 600;
  color: var(--ink-soft); background: none; cursor: pointer;
  border: 1px solid var(--hairline); border-radius: var(--radius-md);
  padding: 6px 12px; display: flex; align-items: center; gap: 8px;
}
.topbar-shortcuts:hover { color: var(--ink); box-shadow: var(--shadow-soft); }
.topbar-shortcuts kbd {
  font-family: var(--font-body); font-size: 0.62rem;
  border: 1px solid var(--hairline); border-bottom-width: 2px;
  border-radius: 4px; padding: 1px 5px; background: var(--paper);
}

/* ============================================================
   SIDEBAR
   ============================================================ */
#sidebar {
  border-right: 1px solid var(--hairline);
  background: var(--surface);
  padding: var(--sp-5) var(--sp-3);
  display: flex; flex-direction: column; gap: var(--sp-2);
  position: sticky; top: var(--topbar-height);
  height: calc(100dvh - var(--topbar-height));
  overflow-y: auto;
}
.nav-links { list-style: none; display: flex; flex-direction: column; gap: 2px; }
.nav-link {
  display: flex; align-items: center; gap: 11px;
  padding: 9px 12px; border-radius: var(--radius-md);
  font-size: 0.9rem; font-weight: 500; color: var(--ink-soft);
  text-decoration: none; border: 1px solid transparent;
  transition: background var(--dur), color var(--dur);
}
.nav-link .material-icons-round { font-size: 1.1rem; }
.nav-link:hover { color: var(--ink); background: rgba(26,43,74,0.04); }
.nav-link.active {
  color: var(--navy); font-weight: 600;
  background: var(--paper);
  border-color: var(--hairline);
  position: relative;
}
.nav-link.active::before {
  content: ''; position: absolute; left: -13px; top: 8px; bottom: 8px;
  width: 2px; background: var(--gold); border-radius: 2px;
}
.nav-link:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.sidebar-motto {
  margin-top: auto;
  border-top: 1px solid var(--hairline-soft); padding-top: var(--sp-4);
  font-size: 0.72rem; color: var(--ink-soft); text-align: center;
  letter-spacing: 0.06em;
}
.sidebar-motto-stars {
  color: var(--gold-soft); letter-spacing: 0.3em; font-size: 0.65rem;
  display: block; margin-bottom: 4px;
}
```

In the mobile-nav rules (search `.mobile-nav-toggle` and `.sidebar-overlay`), keep layout but swap any hardcoded colors to `var(--surface)` background, `var(--ink)` icon, `1px solid var(--hairline)` border, `var(--shadow-soft)` shadow. Search `@media` blocks and other rules referencing `.topbar-nav`/`.topbar-link` and delete those selectors (they no longer exist). **Important:** `body.study-active` rules hide the sidebar during study sessions — keep that behavior (the approved mockup's study view has no sidebar); only update its selectors if they reference deleted classes.

- [ ] **Step 4: Build + verify**

Run: `npm run build` → exits 0.

Browser: masthead shows "★ Civic Flash Cards | USCIS CIVICS · 2025 EDITION" with a Shortcuts button that opens the modal; no nav links in the masthead. Sidebar shows Dashboard/Study/Library/Stats/Settings with gold tick on the active item; "E pluribus unum" pinned at bottom; no Reset Progress. Clicking Study starts a daily session. At ≤768px width the drawer still opens/closes.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/civic-topbar.ts src/components/app/civic-sidebar.ts src/styles/index.css
git commit -m "feat: consolidate nav into Federal Editorial masthead + sidebar"
```

---

### Task 3: Category tints, gold-star mastery, library card tile

**Files:**
- Modify: `src/styles/index.css` — replace `cat-A`…`cat-H` background/icon color rules, `.mastery-bar`/`.mastery-seg` rules, and the `.card-brutal*` section
- Modify: `src/components/shared/mastery-bar.ts` (segments → stars)
- Modify: `src/components/shared/card-brutal.ts` (band header + stars footer)

**Interfaces:**
- Consumes: `.stars-mastery`/`.off` helper from Task 1; tint tokens.
- Produces: `mastery-bar` renders `<span class="stars-mastery">` with `level` attribute API unchanged (0–5). `card-brutal` keeps `card` property setter, `card-click` event, and `.card-brutal` class on the host. Library (Task 6) and dashboard (Task 4) reuse both unchanged.

- [ ] **Step 1: Rewrite `mastery-bar.ts` render()**

```ts
private render() {
  const lvl = Math.max(0, Math.min(5, this.level));
  this.innerHTML = `
    <span class="stars-mastery" role="img" aria-label="Mastery level ${lvl} of 5">${
      '★'.repeat(lvl)
    }<span class="off">${'★'.repeat(5 - lvl)}</span></span>
  `;
}
```

Delete the `COLORS` const at the top of the file. Keep the `level` getter/setter and observedAttributes exactly as they are.

- [ ] **Step 2: Replace category color classes in `index.css`**

Find the `cat-A`…`cat-H` rules (search `.cat-A`) and replace all background + icon-color pairs with the tint table from the header (example for A; repeat for B–H with the table values):

```css
.cat-A { background: #E9EDF4; color: #46608F; }
.cat-icon-A { color: #46608F; }
```

- [ ] **Step 3: Rewrite `card-brutal.ts` render()**

```ts
private render() {
  const card = this._card;
  if (!card) return;

  const cat = CATEGORIES[card.cat];
  const mastery = Store.getCardMastery(card.id);
  const cssClass = CAT_CSS[card.cat as CategoryId];

  this.setAttribute('aria-label', `Question ${card.id}: ${card.q.substring(0, 40)}`);
  this.innerHTML = `
    <div class="card-brutal-header ${cssClass}">
      <span>${cat.name.split(' ').slice(0, 2).join(' ')}</span>
      <span class="card-brutal-qnum">No. ${card.id}</span>
    </div>
    <div class="card-brutal-body">
      <div class="card-brutal-title">${card.q.length > 80 ? card.q.substring(0, 77) + '…' : card.q}</div>
      <div class="card-brutal-desc">${card.a}</div>
    </div>
    <div class="card-brutal-footer">
      <span>Mastery</span>
      <mastery-bar level="${mastery.masteryLevel}"></mastery-bar>
    </div>
  `;
}
```

(The `CAT_ICONS` import becomes unused — remove it from the import line.)

- [ ] **Step 4: Replace `.card-brutal*` and `.mastery-bar` CSS sections**

Delete existing `.card-brutal`, `.card-brutal-header`, `.card-brutal-body`, `.card-brutal-title`, `.card-brutal-desc`, `.card-brutal-footer`, `.mastery-bar`, `.mastery-seg`, `.filled-*` rules. Insert:

```css
/* ============================================================
   QUESTION CARD TILE
   ============================================================ */
.card-brutal {
  display: flex; flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  overflow: hidden; cursor: pointer;
  transition: box-shadow .18s var(--ease), transform .18s var(--ease);
}
.card-brutal:hover { box-shadow: var(--shadow-soft); transform: translateY(-2px); }
.card-brutal:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.card-brutal-header {
  padding: 8px 14px;
  font-size: 0.64rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  display: flex; justify-content: space-between; align-items: center;
}
.card-brutal-qnum {
  font-family: var(--font-display); font-style: italic; font-weight: 500;
  letter-spacing: 0; text-transform: none; font-size: 0.78rem; opacity: 0.8;
}
.card-brutal-body { padding: 14px 14px 12px; flex: 1; }
.card-brutal-title {
  font-family: var(--font-display); font-size: 1rem; font-weight: 600; line-height: 1.35;
  margin-bottom: 6px;
}
.card-brutal-desc {
  font-size: 0.8rem; color: var(--ink-soft);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-brutal-footer {
  padding: 9px 14px;
  border-top: 1px solid var(--hairline-soft);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.66rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-soft);
}
```

- [ ] **Step 5: Build + verify**

Run: `npm run build` → exits 0.

Browser → `#/library`: tiles show muted tinted bands with "No. N" in italic serif, serif question titles, 2-line clamped answers, and 5 gold/dim stars bottom-right. Click a tile → detail modal still opens (its own restyle comes in Task 7). Dashboard grid tiles match.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/mastery-bar.ts src/components/shared/card-brutal.ts src/styles/index.css
git commit -m "feat: archival category tints, gold-star mastery, editorial card tiles"
```

---

### Task 4: Dashboard — greeting, study plans, progress ledger

**Files:**
- Modify: `src/components/views/civic-dashboard.ts` (template rewrite)
- Modify: `src/components/shared/session-launcher.ts` (roman numerals, featured variant)
- Modify: `src/components/shared/stat-colored.ts` (ledger row rendering)
- Modify: `src/styles/index.css` — replace `.dashboard-*`, `.session-launcher*`, `.sidebar-box*`, `.stat-colored*`, `.stat-total*`, `.filter-bar`/`.filter-select`/`.filter-chip`, `.history-*`, `.trend-*`, `.empty-state`, `.add-card-placeholder` sections

**Interfaces:**
- Consumes: `card-brutal`, `mastery-bar` (Task 3); `.eyebrow`, `.double-rule` (Task 1).
- Produces: `session-launcher` keeps `sessionType` setter + `launch` event; gains `featured` attribute (set by dashboard for `daily`). `stat-colored` keeps attribute API (`icon`, `value`, `label`, `variant`) but renders a ledger row (`.ledger-row`); variants map to dot colors. Dashboard IDs (`#session-grid`, `#card-grid`, `#category-filter`, `#toggle-hide-mastered`, `#toggle-shuffle`, `#start-study-mode`) unchanged so `attachEvents()` logic is reusable as-is.

- [ ] **Step 1: Rewrite `session-launcher.ts` render()** (roman numerals replace emoji; drop `SESSION_ICONS` import)

```ts
const ROMANS: Record<string, string> = { mock: 'I.', daily: 'II.', weekly: 'III.', monthly: 'IV.', full: 'V.' };

// in render():
private render() {
  const t = this._type;
  if (!t) return;
  this.className = 'session-launcher';
  if (t.id === 'daily') this.setAttribute('featured', '');
  this.setAttribute('aria-label', `Start ${t.name} — ${t.cardCount} cards`);
  this.innerHTML = `
    <div class="session-launcher-roman">${ROMANS[t.id] ?? '•'}</div>
    <div class="session-launcher-name">${t.name}</div>
    <div class="session-launcher-meta">${t.cardCount} cards</div>
    <div class="session-launcher-rule"></div>
    <div class="session-launcher-go">Begin →</div>
  `;
}
```

- [ ] **Step 2: Rewrite `stat-colored.ts` render()** as a ledger row (attribute API unchanged)

```ts
private render() {
  const value = this.getAttribute('value') || '0';
  const label = this.getAttribute('label') || '';
  const variant = this.getAttribute('variant') || '';
  this.innerHTML = `
    <div class="ledger-row ${variant}">
      <span class="ledger-row-label"><span class="ledger-dot"></span>${label}</span>
      <span class="ledger-row-value">${value}</span>
    </div>
  `;
}
```

(`icon` attribute is accepted but no longer rendered — callers don't need to change.)

- [ ] **Step 3: Rewrite the dashboard template** in `civic-dashboard.ts` `render()`

Replace the `this.innerHTML = ...` block with (keep everything else — `renderLaunchers`, `renderCardGrid`, `renderHistory`, `attachEvents` all keep working because IDs/classes are preserved):

```ts
const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

this.innerHTML = `
  <div class="dashboard-view">
    <div class="dashboard-main">
      <div class="dashboard-header">
        <div class="eyebrow">${dateStr}</div>
        <h1>${greeting}, Citizen&#8209;to&#8209;be.</h1>
        <p>You've mastered ${stats.mastered} of ${stats.total} questions. Steady on — the oath awaits.</p>
        <div class="double-rule"></div>
      </div>

      <div class="section-head"><h2>Study Plans</h2></div>
      <div class="session-grid" id="session-grid"></div>

      <div class="section-head">
        <h2>Continue where you left off</h2>
        <a class="section-head-link" href="#/library">All ${stats.total} cards →</a>
      </div>
      <div class="filter-bar">
        <select class="filter-select" id="category-filter" aria-label="Filter by category">
          <option value="all">Category: All</option>
          ${(Object.keys(CATEGORIES) as CategoryId[]).map(catId =>
            `<option value="${catId}" ${this.categoryFilter === catId ? 'selected' : ''}>${CATEGORIES[catId].name}</option>`
          ).join('')}
        </select>
        <button class="filter-chip ${this.hideMastered ? 'active' : ''}" id="toggle-hide-mastered">
          <span class="material-icons-round">${this.hideMastered ? 'check_box' : 'check_box_outline_blank'}</span>
          Hide Mastered
        </button>
        <button class="filter-chip" id="toggle-shuffle">
          <span class="material-icons-round">shuffle</span>
          Shuffle
        </button>
      </div>
      <div class="card-grid" id="card-grid"></div>

      <div class="section-head"><h2>Recent Sessions</h2></div>
      ${this.renderHistory(sessions)}
    </div>

    <div class="dashboard-sidebar">
      <div class="progress-ledger">
        <div class="progress-ledger-head">
          <span class="eyebrow eyebrow-quiet">Progress Ledger</span>
          <span class="progress-ledger-star">★</span>
        </div>
        <div class="progress-ledger-big">
          <span class="progress-ledger-num">${stats.mastered}</span>
          <span class="progress-ledger-of">of ${stats.total} mastered</span>
        </div>
        <div class="progress-ledger-rows">
          <stat-colored value="${stats.mastered}" label="Mastered" variant="stat-green"></stat-colored>
          <stat-colored value="${stats.inProgress}" label="In progress" variant="stat-pink"></stat-colored>
          <stat-colored value="${stats.notStarted}" label="Not started" variant="stat-yellow"></stat-colored>
        </div>
        <button class="btn btn-navy" id="start-study-mode">Start Daily Review</button>
      </div>
      <div class="sidebar-box">
        <div class="sidebar-box-header">Mastery Trend</div>
        <div class="mastery-trend"><trend-chart></trend-chart></div>
      </div>
    </div>
  </div>
`;
```

Note the old `.history-title` markup is replaced by a `.section-head` — update `renderHistory` only if it referenced removed classes (it doesn't; it renders `.history-list`, kept).

- [ ] **Step 4: Replace the dashboard-related CSS sections**

Delete existing `.dashboard-*`, `.session-grid`, `.session-launcher*`, `.sidebar-box*`, `.stat-colored*`, `.stat-total*`, `.filter-bar`, `.filter-select`, `.filter-chip`, `.search-wrapper`, `.search-input`, `.history-*`, `.trend-*`, `.empty-state`, `.add-card-placeholder` rules and insert:

```css
/* ============================================================
   DASHBOARD
   ============================================================ */
.dashboard-view {
  display: grid; grid-template-columns: 1fr var(--right-sidebar-width);
  gap: var(--sp-8); padding: var(--sp-8) var(--sp-10); align-items: start;
  max-width: 1280px; margin: 0 auto;
}
.dashboard-main { min-width: 0; }
.dashboard-header h1 {
  font-family: var(--font-display); font-size: 2.1rem; font-weight: 600;
  letter-spacing: -0.01em; line-height: 1.15; margin: 6px 0 4px;
}
.dashboard-header p { color: var(--ink-soft); font-size: 0.95rem; }

.section-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin: var(--sp-6) 0 var(--sp-4);
}
.section-head h2 { font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; }
.section-head-link { font-size: 0.82rem; font-weight: 600; color: var(--navy); text-decoration: none; }
.section-head-link:hover { color: var(--gold); }
.eyebrow-quiet { color: var(--ink-soft); }

/* Study plan launchers */
.session-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: var(--sp-4); }
.session-launcher {
  display: block; background: var(--surface);
  border: 1px solid var(--hairline); border-radius: var(--radius-md);
  padding: 16px 16px 14px; cursor: pointer;
  transition: box-shadow .18s var(--ease), transform .18s var(--ease), border-color .18s var(--ease);
}
.session-launcher:hover { box-shadow: var(--shadow-soft); transform: translateY(-2px); border-color: rgba(176,141,62,0.5); }
.session-launcher:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.session-launcher-roman { font-family: var(--font-display); font-size: 0.85rem; font-weight: 600; color: var(--gold); letter-spacing: 0.08em; }
.session-launcher-name { font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; margin: 6px 0 2px; }
.session-launcher-meta { font-size: 0.76rem; color: var(--ink-soft); }
.session-launcher-rule { height: 1px; background: var(--hairline-soft); margin: 12px 0 10px; }
.session-launcher-go { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--navy); }
.session-launcher[featured] { background: var(--navy); border-color: var(--navy); }
.session-launcher[featured] .session-launcher-roman { color: var(--gold-soft); }
.session-launcher[featured] .session-launcher-name { color: #F4F1E8; }
.session-launcher[featured] .session-launcher-meta { color: rgba(244,241,232,0.65); }
.session-launcher[featured] .session-launcher-rule { background: rgba(244,241,232,0.15); }
.session-launcher[featured] .session-launcher-go { color: var(--gold-soft); }

/* Progress ledger (right rail) */
.dashboard-sidebar { display: flex; flex-direction: column; gap: var(--sp-4); position: sticky; top: calc(var(--topbar-height) + var(--sp-6)); }
.progress-ledger {
  background: var(--surface); border: 1px solid var(--hairline);
  border-radius: var(--radius-md); box-shadow: var(--shadow-soft); overflow: hidden;
}
.progress-ledger-head {
  padding: 13px 18px 11px; border-bottom: 1px solid var(--hairline);
  display: flex; justify-content: space-between; align-items: center;
}
.progress-ledger-star { color: var(--gold); font-size: 0.8rem; }
.progress-ledger-big {
  padding: 16px 18px; display: flex; align-items: baseline; gap: 10px;
  border-bottom: 1px solid var(--hairline-soft);
}
.progress-ledger-num { font-family: var(--font-display); font-size: 2.6rem; font-weight: 600; line-height: 1; }
.progress-ledger-of { color: var(--ink-soft); font-size: 0.82rem; }
.progress-ledger-rows { padding: 4px 0; }
.progress-ledger .btn { margin: 12px 18px 16px; width: calc(100% - 36px); }

.ledger-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 18px; font-size: 0.85rem;
}
stat-colored + stat-colored .ledger-row { border-top: 1px solid var(--hairline-soft); }
.ledger-row-label { color: var(--ink-soft); display: flex; align-items: center; gap: 8px; }
.ledger-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(26,43,74,0.25); }
.ledger-row.stat-green .ledger-dot { background: var(--gold); }
.ledger-row.stat-pink .ledger-dot { background: var(--navy); }
.ledger-row-value { font-weight: 600; font-variant-numeric: tabular-nums; }

/* Generic right-rail box */
.sidebar-box {
  background: var(--surface); border: 1px solid var(--hairline);
  border-radius: var(--radius-md); padding: 14px 18px 16px;
}
.sidebar-box-header {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-soft); margin-bottom: 10px;
  display: flex; align-items: center; gap: 8px;
}
.sidebar-box-body { display: flex; flex-direction: column; }

/* Filters */
.filter-bar { display: flex; gap: var(--sp-2); flex-wrap: wrap; align-items: center; margin-bottom: var(--sp-4); }
.filter-select, .filter-chip, .search-input {
  font-family: var(--font-body); font-size: 0.8rem; font-weight: 500; color: var(--ink);
  background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-md);
  padding: 8px 12px;
}
.filter-chip { display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--ink-soft); }
.filter-chip .material-icons-round { font-size: 1rem; }
.filter-chip:hover { color: var(--ink); box-shadow: var(--shadow-soft); }
.filter-chip.active { color: var(--navy); border-color: var(--gold); background: var(--gold-tint); font-weight: 600; }
.search-wrapper { position: relative; display: flex; align-items: center; flex: 1; min-width: 200px; }
.search-wrapper .material-icons-round {
  position: absolute; left: 10px; font-size: 1.05rem; color: var(--ink-soft); pointer-events: none;
}
.search-wrapper .search-input { width: 100%; padding-left: 34px; }
.search-input:focus, .filter-select:focus { outline: 2px solid var(--gold); outline-offset: 1px; }

/* Card grid + history + misc */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: var(--sp-4); margin-bottom: var(--sp-6); }
.add-card-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  border: 1px dashed var(--hairline); border-radius: var(--radius-md);
  color: var(--ink-soft); font-size: 0.82rem; font-weight: 600; cursor: pointer; min-height: 140px;
}
.add-card-placeholder:hover { color: var(--navy); border-color: var(--gold-soft); }
.history-list { display: flex; flex-direction: column; border: 1px solid var(--hairline); border-radius: var(--radius-md); background: var(--surface); overflow: hidden; }
.history-item { display: flex; align-items: center; gap: var(--sp-3); padding: 10px 14px; }
.history-item + .history-item { border-top: 1px solid var(--hairline-soft); }
.history-item-badge {
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 4px; white-space: nowrap;
}
.history-item-info { flex: 1; min-width: 0; }
.history-item-date { font-size: 0.78rem; color: var(--ink-soft); }
.history-item-score { font-family: var(--font-display); font-weight: 600; font-size: 1rem; }
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: var(--sp-8); color: var(--ink-soft); font-size: 0.85rem;
  border: 1px dashed var(--hairline); border-radius: var(--radius-md); grid-column: 1 / -1;
}
.mastery-trend { padding-top: 4px; }
.trend-bars { display: flex; align-items: flex-end; gap: 4px; height: 64px; }
.trend-bar { flex: 1; background: var(--hairline); border-radius: 2px 2px 0 0; }
.trend-bar.highlight { background: var(--gold); }
```

Also update `civic-dashboard.ts` `renderCardGrid()` slice from 20 → 6 (`filtered.slice(0, 6)`) so the dashboard grid stays subordinate, per spec ("visually subordinate to the study plans").

**Known interim state:** deleting the `.stat-colored*` rules here unstyles the stat tiles on the Stats view until Task 7 rebuilds them as `.stat-block`. The view stays functional (plain text); do not "fix" it in this task.

- [ ] **Step 5: Add `.btn-navy` / `.btn-pink` refinements**

Search `.btn-navy` and `.btn-pink` in `index.css`; replace their color rules:

```css
.btn-navy { background: var(--navy); color: #F4F1E8; border-color: var(--navy); }
.btn-navy:hover { background: #2A4270; }
.btn-pink { background: var(--red); color: #F7F3EA; border-color: var(--red); }
.btn-pink:hover { background: #B23A33; }
```

- [ ] **Step 6: Build + verify**

Run: `npm run build` → exits 0.

Browser → `#/dashboard`: date eyebrow + serif greeting + double rule; five study-plan cards with roman numerals, Daily Review filled navy; Progress Ledger on the right with big serif numeral, three ledger rows, "Start Daily Review" navy button; six question tiles under "Continue where you left off"; Recent Sessions list (or dashed empty state). Launch a plan → study still works. Check `hideMastered`/shuffle/category filters still update the grid.

- [ ] **Step 7: Commit**

```bash
git add src/components/views/civic-dashboard.ts src/components/shared/session-launcher.ts src/components/shared/stat-colored.ts src/styles/index.css
git commit -m "feat: Federal Editorial dashboard with study plans and progress ledger"
```

---

### Task 5: Study mode — certificate flashcard, session bar, rating

**Files:**
- Modify: `src/components/shared/flash-card.ts` (corner brackets, eyebrow, No. seal)
- Modify: `src/components/views/civic-study.ts` (session bar + sidebar template)
- Modify: `src/styles/index.css` — replace `.study-*`, `.session-progress-*`, `.flashcard*`, `.btn-still-learning`, `.btn-i-know-this`, `.btn-nav-arrow`, `.rating-*`, `.streak-box*`, `.study-tip*` sections

**Interfaces:**
- Consumes: tint classes (Task 3), `.eyebrow` (Task 1).
- Produces: `flash-card` keeps `card`/`flipped` API and `flip` event; `.flashcard.flipped` still drives the 3D rotation. Study view keeps every element ID (`#progress-ring` id is retired — see step 2 — `#progress-sub`, `#stat-mastered`, `#stat-struggling`, `#stat-accuracy`, `#stat-time`, `#stat-streak`, `#btn-still-learning`, `#btn-i-know-this`, `#card-prev`, `#card-next`, `#rating-bar`, `#flashcard-container`, `#session-complete`).

- [ ] **Step 1: Rewrite `flash-card.ts` render()**

```ts
private render() {
  const card = this._card;
  if (!card) return;

  const cat = CATEGORIES[card.cat];
  const css = CAT_CSS[card.cat as CategoryId];
  const corner = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 13V4a3 3 0 0 1 3-3h9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
  const frame = `
    <span class="flashcard-corner tl">${corner}</span>
    <span class="flashcard-corner tr">${corner}</span>
    <span class="flashcard-corner br">${corner}</span>
    <span class="flashcard-corner bl">${corner}</span>
    <span class="flashcard-number">No. ${card.id}</span>
  `;

  this.innerHTML = `
    <div class="flashcard-scene">
      <div class="flashcard ${this._flipped ? 'flipped' : ''}" tabindex="0" role="button"
           aria-label="Press Space to flip card">
        <div class="flashcard-face front">
          ${frame}
          <div class="flashcard-cat-eyebrow ${css}">${cat ? cat.name : ''}</div>
          <div class="flashcard-question">${card.q}</div>
          <div class="flashcard-hint">Press <kbd>Space</kbd> to reveal the answer</div>
        </div>
        <div class="flashcard-face back">
          ${frame}
          <div class="flashcard-cat-eyebrow ${css}">Answer</div>
          <div class="flashcard-answer">${card.a}</div>
        </div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 2: Update `civic-study.ts` template** — replace the `.session-progress-bar` block and the sidebar block inside `render()`'s `innerHTML` (leave `#flashcard-container`, `.study-actions`, `rating-bar`, `#session-complete` markup as is):

Progress header becomes:

```html
<div class="session-bar">
  <span class="eyebrow eyebrow-quiet">${this.session ? SESSION_TYPES[this.session.type]?.name ?? this.session.typeName : 'Study'}</span>
  <div class="session-track"><div class="session-track-fill" id="progress-fill" style="width:${pct}%"></div></div>
  <span class="session-count" id="progress-sub">${reviewed} / ${total}</span>
</div>
```

Sidebar becomes:

```html
<div class="study-sidebar">
  <div class="streak-box">
    <div class="streak-box-stars">★ ★ ★</div>
    <div class="streak-box-value" id="stat-streak">0</div>
    <div class="streak-box-label">Card streak</div>
  </div>
  <div class="sidebar-box">
    <div class="sidebar-box-header">Session Ledger</div>
    <div class="sidebar-box-body">
      <div class="stat-row"><span class="stat-row-label">Mastered</span><span class="stat-row-value stat-good" id="stat-mastered">0</span></div>
      <div class="stat-row"><span class="stat-row-label">Still learning</span><span class="stat-row-value stat-bad" id="stat-struggling">0</span></div>
      <div class="stat-row"><span class="stat-row-label">Accuracy</span><span class="stat-row-value" id="stat-accuracy">0%</span></div>
      <div class="stat-row"><span class="stat-row-label">Avg. time</span><span class="stat-row-value" id="stat-time">0.0s</span></div>
    </div>
  </div>
  <div class="study-tip">
    <div class="sidebar-box-header study-tip-header">Study Tip</div>
    <p>“${STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]}”</p>
  </div>
</div>
```

Then adjust the two methods that referenced removed elements:
- `updateProgress()`: replace the `#progress-ring` text update with a width update — `const fill = this.querySelector('#progress-fill') as HTMLElement | null; if (fill) fill.style.width = \`${pct}%\`;` and set `#progress-sub` text to `` `${reviewed} / ${total}` ``.
- `updateStats()`: `#stat-streak` now gets just the number — `e5.textContent = String(this.streak);`.
- In `completeSession()`'s inline-styled overlay HTML, replace `font-weight: 800; text-transform: uppercase;` on the title with `font-weight: 600;` (serif title shouldn't be uppercase), and change the two inline `stat-colored` usages to remain as-is (they render ledger rows now — acceptable).
- Remove the unused `CATEGORIES` import if tsc flags it (flash-card owns category display now).

- [ ] **Step 3: Replace study CSS sections**

Delete `.study-view`, `.study-main`, `.study-sidebar`, `.session-progress-*`, `.flashcard-scene`, `.flashcard` (and all `.flashcard-*`), `.study-actions`, `.btn-still-learning`, `.btn-i-know-this`, `.btn-nav-arrow`, `.rating-section`, `.rating-label`, `.rating-buttons`, `.rating-btn*`, `.streak-box*`, `.study-tip*`, `.stat-row*` rules. Insert:

```css
/* ============================================================
   STUDY MODE
   ============================================================ */
.study-view {
  display: grid; grid-template-columns: 1fr var(--right-sidebar-width);
  gap: var(--sp-8); padding: var(--sp-8) var(--sp-10); align-items: start;
  max-width: 1180px; margin: 0 auto;
}
.study-main { min-width: 0; display: flex; flex-direction: column; align-items: center; }

.session-bar { width: 100%; display: flex; align-items: center; gap: var(--sp-4); margin-bottom: var(--sp-6); }
.session-track { flex: 1; height: 3px; background: rgba(26,43,74,0.1); border-radius: 3px; overflow: hidden; }
.session-track-fill { height: 100%; background: var(--gold); transition: width .3s var(--ease); }
.session-count { font-family: var(--font-display); font-size: 0.9rem; font-weight: 600; font-variant-numeric: tabular-nums; }

/* Certificate flashcard */
.flashcard-scene { width: 100%; max-width: 620px; perspective: 1500px; }
.flashcard {
  position: relative; width: 100%; min-height: 340px;
  transform-style: preserve-3d; transition: transform .5s var(--ease);
  cursor: pointer;
}
.flashcard.flipped { transform: rotateY(180deg); }
.flashcard:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }
.flashcard-face {
  position: absolute; inset: 0; backface-visibility: hidden;
  background: var(--surface);
  border: 1px solid var(--hairline); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  padding: 10px;
}
.flashcard-face::after {
  content: ''; position: absolute; inset: 10px;
  border: 1px solid var(--hairline); border-radius: var(--radius-md);
  pointer-events: none;
}
.flashcard-face.back { transform: rotateY(180deg); }
.flashcard-face > .flashcard-cat-eyebrow,
.flashcard-face > .flashcard-question,
.flashcard-face > .flashcard-answer,
.flashcard-face > .flashcard-hint { position: relative; z-index: 1; }
.flashcard-face.front, .flashcard-face.back {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center;
}
.flashcard-corner { position: absolute; width: 14px; height: 14px; color: var(--gold-soft); z-index: 1; }
.flashcard-corner.tl { top: 20px; left: 20px; }
.flashcard-corner.tr { top: 20px; right: 20px; transform: rotate(90deg); }
.flashcard-corner.br { bottom: 20px; right: 20px; transform: rotate(180deg); }
.flashcard-corner.bl { bottom: 20px; left: 20px; transform: rotate(270deg); }
.flashcard-number {
  position: absolute; top: 26px; right: 42px;
  font-family: var(--font-display); font-style: italic; font-size: 0.85rem; color: var(--ink-soft);
}
.flashcard-cat-eyebrow {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
  background: none !important;
  display: flex; align-items: center; gap: 10px; margin-bottom: var(--sp-5);
  padding: 0 var(--sp-6);
}
.flashcard-cat-eyebrow::before, .flashcard-cat-eyebrow::after {
  content: ''; width: 24px; height: 1px; background: var(--hairline);
}
.flashcard-question, .flashcard-answer {
  font-family: var(--font-display); font-size: 1.7rem; font-weight: 500; line-height: 1.3;
  max-width: 480px; padding: 0 var(--sp-8);
}
.flashcard-answer { font-size: 1.35rem; }
.flashcard-hint {
  margin-top: var(--sp-6); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-soft);
  display: flex; align-items: center; gap: 8px;
}
.flashcard-hint kbd {
  font-size: 0.62rem; border: 1px solid var(--hairline); border-bottom-width: 2px;
  border-radius: 4px; padding: 1px 6px; background: var(--paper); font-family: var(--font-body);
}

/* Actions */
.study-actions { display: flex; gap: var(--sp-3); margin-top: var(--sp-6); align-items: center; }
.btn-nav-arrow {
  width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid var(--hairline); background: var(--surface);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--ink-soft);
}
.btn-nav-arrow:hover { color: var(--ink); box-shadow: var(--shadow-soft); }
.btn-still-learning, .btn-i-know-this {
  font-family: var(--font-body); font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 12px 24px; border-radius: var(--radius-md); cursor: pointer;
  border: 1px solid transparent; color: #F7F3EA;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  transition: transform .15s var(--ease), box-shadow .15s var(--ease);
}
.btn-still-learning:hover, .btn-i-know-this:hover { transform: translateY(-1px); box-shadow: var(--shadow-soft); }
.btn-still-learning { background: var(--red); }
.btn-i-know-this { background: var(--navy); }
.btn-still-learning .sub, .btn-i-know-this .sub {
  font-weight: 500; font-size: 0.64rem; letter-spacing: 0.04em; text-transform: none; opacity: 0.75;
}

/* Rating bar */
.rating-section { margin-top: var(--sp-5); opacity: 0; pointer-events: none; transition: opacity var(--dur); text-align: center; }
.rating-section.visible { opacity: 1; pointer-events: auto; }
.rating-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); margin-bottom: 8px; }
.rating-buttons { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.rating-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 64px; padding: 8px 10px;
  background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-md);
  font-family: var(--font-body); font-size: 0.68rem; color: var(--ink-soft); cursor: pointer;
}
.rating-btn:hover { border-color: var(--gold); color: var(--ink); box-shadow: var(--shadow-soft); }
.rating-btn-number { font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--ink); }

/* Right rail */
.study-sidebar { display: flex; flex-direction: column; gap: var(--sp-4); }
.streak-box {
  background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-md);
  text-align: center; padding: 20px 18px;
}
.streak-box-stars { color: var(--gold); letter-spacing: 0.3em; font-size: 0.72rem; }
.streak-box-value { font-family: var(--font-display); font-size: 2.2rem; font-weight: 600; margin-top: 4px; }
.streak-box-label { font-size: 0.66rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-soft); }
.stat-row { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; }
.stat-row + .stat-row { border-top: 1px solid var(--hairline-soft); }
.stat-row-label { color: var(--ink-soft); }
.stat-row-value { font-weight: 600; font-variant-numeric: tabular-nums; }
.stat-row-value.stat-good { color: var(--green); }
.stat-row-value.stat-bad { color: var(--red); }
.study-tip {
  background: var(--paper); border: 1px solid var(--hairline); border-radius: var(--radius-md);
  padding: 14px 18px 16px;
}
.study-tip-header { color: var(--gold); margin-bottom: 6px; }
.study-tip p { font-family: var(--font-display); font-style: italic; font-size: 0.85rem; color: var(--ink-soft); line-height: 1.5; }
```

Remove the inline `style="color: var(--green-dark)"` / `style="color: var(--pink)"` attributes from the study template (the new `stat-good`/`stat-bad` classes replace them — already done in Step 2's template).

- [ ] **Step 4: Build + verify**

Run: `npm run build` → exits 0.

Browser: launch Daily Review. Check: gold session progress line with "N / 16" serif counter; certificate card with inner hairline frame, gold corner brackets, "No. N" italic seal, category eyebrow flanked by dashes, serif question; Space flips (rotation animation intact) and reveals answer + rating bar; 0–5 rating buttons styled; Still Learning (oxblood) / I Know This (navy); right rail shows Card streak box, Session Ledger, italic study tip. Rate all cards → completion overlay appears, buttons work. Esc exits to dashboard.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/flash-card.ts src/components/views/civic-study.ts src/styles/index.css
git commit -m "feat: certificate-style flashcard and Federal Editorial study mode"
```

---

### Task 6: Library view

**Files:**
- Modify: `src/components/views/civic-library.ts` (header + stats line template tweaks)
- Modify: `src/styles/index.css` — replace `.library-*` section

**Interfaces:**
- Consumes: `.filter-bar`/`.search-wrapper`/`.filter-chip` (Task 4), card tiles (Task 3).
- Produces: nothing new — IDs (`#library-search`, `#lib-category-filter`, `#lib-toggle-mastered`, `#start-filtered-study`, `#lib-showing`, `#card-grid`) unchanged; RxJS search stream untouched.

- [ ] **Step 1: Update the library template** in `civic-library.ts` `render()` — replace the header div and the `.library-stats` div only:

```html
<div class="library-header">
  <div class="eyebrow">The Full Deck</div>
  <h1>All 128 Cards</h1>
  <p>Browse and study every USCIS civics question.</p>
  <div class="double-rule"></div>
</div>
```

```html
<div class="library-stats">
  <span><span class="library-stat-value" id="lib-showing">${stats.total}</span> showing</span>
  <span class="library-stat-sep">·</span>
  <span><span class="library-stat-value stat-gold">${stats.mastered}</span> mastered</span>
  <span class="library-stat-sep">·</span>
  <span><span class="library-stat-value">${stats.inProgress}</span> in progress</span>
  <span class="library-stat-sep">·</span>
  <span><span class="library-stat-value">${stats.notStarted}</span> not started</span>
</div>
```

(Removes the three inline `style="color: ..."` attributes. Keep the `btn btn-pink btn-sm` classes on `#start-filtered-study`.)

- [ ] **Step 2: Replace `.library-*` CSS**

Delete existing `.library-view`, `.library-header`, `.library-stats`, `.library-stat-value` rules; insert:

```css
/* ============================================================
   LIBRARY
   ============================================================ */
.library-view { padding: var(--sp-8) var(--sp-10); max-width: 1280px; margin: 0 auto; }
.library-header h1 {
  font-family: var(--font-display); font-size: 2.1rem; font-weight: 600;
  letter-spacing: -0.01em; margin: 6px 0 4px;
}
.library-header p { color: var(--ink-soft); font-size: 0.95rem; }
.library-stats {
  display: flex; gap: 10px; align-items: baseline;
  font-size: 0.82rem; color: var(--ink-soft); margin: var(--sp-4) 0 var(--sp-5);
}
.library-stat-value { font-family: var(--font-display); font-weight: 600; font-size: 1rem; color: var(--ink); }
.library-stat-value.stat-gold { color: var(--gold); }
.library-stat-sep { color: var(--hairline); }
```

- [ ] **Step 3: Build + verify**

Run: `npm run build` → exits 0.

Browser → `#/library`: eyebrow + serif title + double rule; search field with icon, category select, Hide Mastered chip, Study Filtered button all styled; stats line with serif numerals separated by dots; full tile grid. Type in search (debounce still filters), press `F` (focuses search), `M` (toggles mastered), click a card (modal), Study Filtered (launches session).

- [ ] **Step 4: Commit**

```bash
git add src/components/views/civic-library.ts src/styles/index.css
git commit -m "feat: Federal Editorial library view"
```

---

### Task 7: Stats, Settings, modals, toasts + dead-CSS cleanup

**Files:**
- Modify: `src/components/views/civic-stats.ts` (drop inline styles → classes)
- Modify: `src/components/views/civic-settings.ts` (proper classes, keep reset)
- Modify: `src/components/shared/card-detail-modal.ts` (inline styles → classes)
- Modify: `src/styles/index.css` — replace `.stats-*`, `.category-row*`, `.section-title`, `.card-detail*`, `.modal*`, `.toast*`, `.loading-spinner` sections; delete dead rules
- Modify: `.claude/design-system.md` (document the new system)

**Interfaces:**
- Consumes: everything above.
- Produces: classes `.stat-block`, `.settings-panel`, `.setting-row`, `.rating-chip`; `card-detail-modal` API unchanged.

- [ ] **Step 1: Rewrite `civic-stats.ts` template** — replace `stats-grid-4` block and section titles:

```html
<div class="stats-view-header">
  <div class="eyebrow">The Record</div>
  <h1>Statistics</h1>
  <p>Track your progress toward mastering all 128 civics questions.</p>
  <div class="double-rule"></div>
</div>

<div class="stats-grid-4">
  <div class="stat-block"><span class="stat-block-num">${stats.mastered}</span><span class="stat-block-label">Mastered</span></div>
  <div class="stat-block"><span class="stat-block-num">${stats.inProgress}</span><span class="stat-block-label">In Progress</span></div>
  <div class="stat-block"><span class="stat-block-num">${stats.notStarted}</span><span class="stat-block-label">Not Started</span></div>
  <div class="stat-block"><span class="stat-block-num">${sessions.length}</span><span class="stat-block-label">Sessions</span></div>
</div>

<div class="section-head"><h2>Category Mastery</h2></div>
<div class="category-panel">${catRows}</div>

<div class="section-head"><h2>All Sessions</h2></div>
```

Keep `catRows` and the sessions list logic; the `category-row-fill` inline `background: ${CAT_COLORS[catId]}` stays, but update `CAT_COLORS` in `src/data/flashcards.ts` to the strong tint values from the table (A `#46608F`, B `#5A7350`, C `#A05C3B`, D `#8A6F2F`, E `#4E6A6A`, F `#6A7A42`, G `#9E5A55`, H `#8A7B4F`).

- [ ] **Step 2: Rewrite `civic-settings.ts` template**

```html
<div class="stats-view-header">
  <div class="eyebrow">Preferences</div>
  <h1>Settings</h1>
  <p>Customize your study experience.</p>
  <div class="double-rule"></div>
</div>

<div class="settings-panel">
  <div class="setting-row">
    <div>
      <div class="setting-row-title">Hide Mastered Cards</div>
      <div class="setting-row-desc">Hide cards you've already mastered from study sessions</div>
    </div>
    <button class="filter-chip ${settings.hideMastered ? 'active' : ''}" id="settings-hide-mastered">
      ${settings.hideMastered ? 'ON' : 'OFF'}
    </button>
  </div>
  <div class="setting-row setting-row-danger">
    <div>
      <div class="setting-row-title">Reset All Progress</div>
      <div class="setting-row-desc">Erases mastery, sessions, and settings. Cannot be undone.</div>
    </div>
    <button class="btn btn-danger" id="settings-reset">Reset</button>
  </div>
</div>
```

Event handlers unchanged (same IDs).

- [ ] **Step 3: Clean `card-detail-modal.ts` inline styles** — swap the inline-styled bits for classes: question content gets `class="card-detail-question"` (no inline font style), rating-history squares become `<span class="rating-chip ${r.rating >= 4 ? 'good' : r.rating >= 2 ? 'mid' : 'low'}">${r.rating}</span>`, and remaining `style="..."` attributes on mastery/last-reviewed rows may stay (pure layout).

- [ ] **Step 4: Replace remaining CSS sections + delete dead rules**

Insert new sections:

```css
/* ============================================================
   STATS & SETTINGS
   ============================================================ */
.stats-view-header h1 {
  font-family: var(--font-display); font-size: 2.1rem; font-weight: 600; margin: 6px 0 4px;
}
.stats-view-header p { color: var(--ink-soft); font-size: 0.95rem; }
.stats-grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--sp-4); margin-bottom: var(--sp-6); }
.stat-block {
  background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-md);
  padding: 16px 18px; display: flex; flex-direction: column; gap: 2px;
}
.stat-block-num { font-family: var(--font-display); font-size: 2rem; font-weight: 600; line-height: 1.1; }
.stat-block-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); }
.category-panel {
  border: 1px solid var(--hairline); background: var(--surface); border-radius: var(--radius-md);
  padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-6);
  display: flex; flex-direction: column; gap: 10px;
}
.category-row { display: flex; align-items: center; gap: var(--sp-3); }
.category-row-label { flex: 0 0 220px; font-size: 0.82rem; color: var(--ink-soft); }
.category-row-bar { flex: 1; height: 6px; background: rgba(26,43,74,0.08); border-radius: 3px; overflow: hidden; }
.category-row-fill { height: 100%; border-radius: 3px; }
.category-row-pct { flex: 0 0 44px; text-align: right; font-family: var(--font-display); font-weight: 600; font-size: 0.9rem; }

.settings-panel {
  border: 1px solid var(--hairline); background: var(--surface); border-radius: var(--radius-md);
  max-width: 560px; overflow: hidden;
}
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-4) var(--sp-5); }
.setting-row + .setting-row { border-top: 1px solid var(--hairline-soft); }
.setting-row-title { font-weight: 600; font-size: 0.9rem; }
.setting-row-desc { font-size: 0.78rem; color: var(--ink-soft); }
.setting-row-danger .setting-row-title { color: var(--red); }
.btn-danger { background: none; color: var(--red); border-color: var(--red); }
.btn-danger:hover { background: var(--red); color: #F7F3EA; }

/* Detail modal + shortcuts modal + toast */
.card-detail-question { font-family: var(--font-display); font-weight: 600; font-size: 1.15rem; line-height: 1.35; }
.rating-chip {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border: 1px solid var(--hairline); border-radius: 4px;
  font-size: 0.7rem; font-weight: 700;
}
.rating-chip.good { background: var(--green-tint); color: var(--green); }
.rating-chip.mid { background: var(--gold-tint); color: #8A6F2F; }
.rating-chip.low { background: var(--red-soft); color: var(--red); }
```

Then restyle in place (edit colors/borders only, keep layout): `.card-detail-overlay` (backdrop → `rgba(26,43,74,0.4)`), `.card-detail` (surface bg, hairline border, `--radius-lg`, `--shadow-soft`), `.card-detail-header` (paper bg, hairline bottom border), `.modal`/`.shortcut-*`/`kbd` (same treatment), `.toast` (surface bg, hairline, soft shadow, 6px radius, ink text; variant left-border 3px in `--green`/`--gold`/`--red`/`--navy`), `.loading-spinner` (gold spinner on paper).

Finally delete rules that no longer have callers — search for and remove: `.session-launcher-icon`, `.stat-colored` (all), `.stat-total*`, `.history-title`, `.mastery-seg`, `.filled-green/.filled-teal/.filled-yellow/.filled-pink`, `.flashcard-cat-tag`, `.flashcard-answer-label`, `.sidebar-upgrade`, any `repeating-linear-gradient` flag-stripe decorations, and the `.session-progress-ring` block.

- [ ] **Step 5: Update `.claude/design-system.md`** — rewrite the doc to describe Federal Editorial: new token table (from this plan's header), typography (Fraunces/Public Sans), hairline/double-rule/shadow-soft rules, category tint table, and the component class list (masthead, sidebar, plans, ledger, tiles, certificate flashcard, stars mastery). Keep the same doc structure (Overview / Tokens / Typography / Rules).

- [ ] **Step 6: Build + verify (full sweep)**

Run: `npm run build` → exits 0.

Browser sweep, desktop (≥1280px) AND mobile (375px):
1. Dashboard: all sections styled, no leftover brutalist chunks.
2. Study (full flow): launch → flip → rate 0–5 via keys → complete overlay → back to dashboard.
3. Library: search/filter/modal/study-filtered.
4. Stats: stat blocks, category bars in muted strong tints, session list.
5. Settings: toggle + reset (confirm dialog, toast).
6. Shortcuts modal (`?`), toasts, loading spinners all restyled.
7. Keyboard: `1`, `2`, `?`, Space, arrows, `F`, `M`, Esc.
8. Mobile: drawer nav opens/closes; study view stacks; tiles single-column.

- [ ] **Step 7: Commit**

```bash
git add src/components/views/civic-stats.ts src/components/views/civic-settings.ts src/components/shared/card-detail-modal.ts src/data/flashcards.ts src/styles/index.css .claude/design-system.md
git commit -m "feat: Federal Editorial stats, settings, modals, toasts; drop dead brutalist CSS"
```

---

### Task 8: Responsive pass + final verification

**Files:**
- Modify: `src/styles/index.css` — audit/replace all `@media` blocks
- Modify: `README.md:18` (design bullet) and `CLAUDE.md` design-system reference line

**Interfaces:** none new.

- [ ] **Step 1: Audit every `@media` block in `index.css`**

The old breakpoints reference deleted classes. For each block: drop selectors that no longer exist; ensure these behaviors at ≤1024px and ≤768px:

```css
@media (max-width: 1024px) {
  .dashboard-view, .study-view { grid-template-columns: 1fr; }
  .dashboard-sidebar, .study-sidebar { position: static; flex-direction: row; flex-wrap: wrap; }
  .dashboard-sidebar > *, .study-sidebar > * { flex: 1 1 240px; }
}
@media (max-width: 768px) {
  .app-body { grid-template-columns: 1fr; }
  #sidebar {
    position: fixed; left: 0; top: var(--topbar-height); bottom: 0; width: 240px;
    transform: translateX(-100%); transition: transform .25s var(--ease); z-index: 300;
  }
  #sidebar.open { transform: translateX(0); }
  .sidebar-overlay { position: fixed; inset: 0; background: rgba(26,43,74,0.35); opacity: 0; pointer-events: none; transition: opacity .25s; z-index: 250; }
  .sidebar-overlay.visible { opacity: 1; pointer-events: auto; }
  .dashboard-view, .study-view, .library-view { padding: var(--sp-5) var(--sp-4); }
  .topbar-brand-sub { display: none; }
  .flashcard-question { font-size: 1.3rem; }
  .study-actions { flex-wrap: wrap; justify-content: center; }
}
```

(Merge with whatever mobile-nav rules already exist — one source of truth per selector.)

- [ ] **Step 2: Update docs**

`README.md` line 18: replace the Patriotic Brutalism bullet with:
`- **Federal Editorial** design — archival paper-and-ink palette, Fraunces + Public Sans, hairline rules, gold-foil accents`

`CLAUDE.md`: change the design-system guideline line to `- [Design System](.claude/design-system.md) — Federal Editorial theme tokens`.

- [ ] **Step 3: Full build + typecheck + preview**

```bash
npm run build && npm run preview
```

Expected: build exits 0. Open the preview URL and repeat the Task 7 Step 6 sweep against the production build (PWA manifest colors now ivory).

- [ ] **Step 4: Commit**

```bash
git add src/styles/index.css README.md CLAUDE.md
git commit -m "feat: responsive pass and docs for Federal Editorial redesign"
```

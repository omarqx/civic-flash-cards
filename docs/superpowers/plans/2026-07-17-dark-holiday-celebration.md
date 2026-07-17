# Dark Theme, Holiday Themes, Mock-Pass Celebration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Three additive features on the Federal Editorial design: (1) a dark theme with Light/Dark/System setting, (2) automatic holiday theming on predictable U.S. civic holidays, (3) a confetti-and-flags celebration when a mock interview is passed (≥12 of 20).

**Architecture:** All colors are already CSS custom properties, so dark mode is a `[data-theme="dark"]` token-override block plus dark category tints; a small theme controller in the app shell resolves Light/Dark/System and stamps `data-theme` on `<html>`. Holidays are pure date math in a data module consumed by the masthead ribbon and dashboard greeting. The celebration is a self-contained canvas Web Component with zero dependencies.

**Tech Stack:** Vite 6, TS 5 strict, vanilla Web Components (Light DOM), RxJS 7 (`rxjs/internal/*` only), single stylesheet `src/styles/index.css`.

## Global Constraints

- ALL CSS in `src/styles/index.css`; Light DOM only; no new npm dependencies.
- Card IDs, routes, custom events, existing component APIs unchanged. localStorage keys unchanged (`civic_settings` gains a new optional field — must merge with defaults so existing stored settings don't break).
- RxJS imports only from `rxjs/internal/*`.
- WCAG AA text contrast in dark theme too (ivory `#E9E4D8` on `#131A2C` passes; gold TEXT on dark uses `--gold-text` overridden to `--gold-soft`-range values, verify ≥4.5:1).
- `prefers-reduced-motion: reduce` disables the confetti animation entirely.
- No test framework: gate is `npm run build` exit 0; controller does browser verification.

---

### Task 1: Dark theme

**Files:**
- Modify: `src/types/index.ts` (AppSettings gains `theme: 'light' | 'dark' | 'system'`)
- Modify: `src/state/store.ts` (settings default + merge)
- Modify: `src/components/app/civic-app.ts` (theme controller)
- Modify: `src/components/views/civic-settings.ts` (theme picker row)
- Modify: `src/styles/index.css` (`--backdrop` token + `[data-theme="dark"]` block)
- Modify: `index.html` (no change to markup; `theme-color` handled in JS)

**Steps:**

1. `src/types/index.ts`: add `theme: 'light' | 'dark' | 'system';` to `AppSettings`.

2. `src/state/store.ts`: default settings become `{ hideMastered: false, shuffleDefault: false, theme: 'system' }` — and the initial `load()` result must be merged over defaults: `{ ...DEFAULT_SETTINGS, ...load(KEYS.settings, {}) }` so previously-stored settings (without `theme`) get the default. `resetAll()` resets to the same defaults object.

3. `src/components/app/civic-app.ts`: add a `setupTheme()` called from `connectedCallback()`:

```ts
private setupTheme() {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const pref = Store.getSettings().theme ?? 'system';
    const dark = pref === 'dark' || (pref === 'system' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#131A2C' : '#F7F3EA');
  };
  apply();
  media.addEventListener('change', apply);
  Store.settings$.subscribe(apply);
}
```

4. `src/components/views/civic-settings.ts`: add a setting row (above Hide Mastered) with three `.filter-chip` buttons Light / Dark / System; `active` class on the current value; click → `Store.updateSettings({ theme: value })`. Re-render on click to update chips.

5. `src/styles/index.css`:
   - Add to `:root`: `--backdrop: rgba(26, 43, 74, 0.4);` and switch `.card-detail-overlay` background and `.modal::backdrop` to `var(--backdrop)`.
   - Add the dark block after `:root` (values are the spec — tune only if a contrast check fails):

```css
[data-theme="dark"] {
  --paper: #131A2C;
  --surface: #1B2438;
  --ink: #E9E4D8;
  --ink-soft: #9AA3B8;
  --navy: #2E4776;
  --red: #C05A52;
  --red-soft: #3A2422;
  --gold: #C9AE6E;
  --gold-soft: #C9AE6E;
  --gold-tint: #332C1C;
  --gold-text: #C9AE6E;
  --green: #7FA379;
  --green-tint: #24301F;
  --hairline: rgba(233, 228, 216, 0.15);
  --hairline-soft: rgba(233, 228, 216, 0.08);
  --shadow-soft: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.6);
  --backdrop: rgba(4, 8, 18, 0.6);
  --gray-100: #222B40;
  --gray-200: #2A3450;
  --gray-300: #3A4560;
  --gray-400: #7C88A3;
  --gray-500: #9AA3B8;
  --gray-600: #C6CCDB;
  --red-light: #3A2422;
  --navy-light: #222B40;
  --green-light: #24301F;
  --yellow-light: #332C1C;
  --pink-light: #3A2422;
}
[data-theme="dark"] .cat-A { background: #202A40; color: #93A9D1; }
[data-theme="dark"] .cat-B { background: #22301F; color: #9DB894; }
[data-theme="dark"] .cat-C { background: #33261F; color: #D19A78; }
[data-theme="dark"] .cat-D { background: #302A1B; color: #C9AC61; }
[data-theme="dark"] .cat-E { background: #222C2C; color: #8FB0B0; }
[data-theme="dark"] .cat-F { background: #282E1D; color: #A8B87A; }
[data-theme="dark"] .cat-G { background: #322222; color: #CE908A; }
[data-theme="dark"] .cat-H { background: #2C2921; color: #BFAE7E; }
[data-theme="dark"] body::before { opacity: 0.05; }
[data-theme="dark"] .rating-chip.mid { color: #C9AC61; }
```

   Check for other hardcoded light-only colors in component rules (e.g. `.session-launcher[featured]` text `#F4F1E8`, `.btn-navy/.btn-pink` text `#F7F3EA`/`#F4F1E8` — these stay legible on the dark navy/red action colors; leave them).

6. Verify: `npm run build` exit 0. Commit: `feat: dark theme with light/dark/system setting`.

---

### Task 2: Holiday themes

**Files:**
- Create: `src/data/holidays.ts`
- Modify: `src/components/app/civic-topbar.ts` (ribbon under masthead — render inside the topbar as a full-width strip is hard; instead the ribbon is its own element rendered by `civic-app` directly after `<civic-topbar>`)
- Modify: `src/components/app/civic-app.ts` (render ribbon when a holiday is on)
- Modify: `src/components/views/civic-dashboard.ts` (holiday greeting)
- Modify: `src/styles/index.css` (`.holiday-ribbon`)

**Steps:**

1. `src/data/holidays.ts`:

```ts
export interface Holiday { name: string; message: string; }

function nthWeekday(date: Date, month: number, weekday: number, n: number): boolean {
  if (date.getMonth() !== month || date.getDay() !== weekday) return false;
  return Math.ceil(date.getDate() / 7) === n;
}
function lastWeekday(date: Date, month: number, weekday: number): boolean {
  if (date.getMonth() !== month || date.getDay() !== weekday) return false;
  const next = new Date(date); next.setDate(date.getDate() + 7);
  return next.getMonth() !== month;
}
function fixed(date: Date, month: number, day: number): boolean {
  return date.getMonth() === month && date.getDate() === day;
}

const RULES: Array<{ holiday: Holiday; match: (d: Date) => boolean }> = [
  { holiday: { name: "New Year's Day", message: 'A fresh year of study begins.' }, match: d => fixed(d, 0, 1) },
  { holiday: { name: 'Martin Luther King, Jr. Day', message: 'He worked for equality for all Americans.' }, match: d => nthWeekday(d, 0, 1, 3) },
  { holiday: { name: "Presidents' Day", message: 'Honoring the nation’s highest office.' }, match: d => nthWeekday(d, 1, 1, 3) },
  { holiday: { name: 'Memorial Day', message: 'Honoring those who died in military service.' }, match: d => lastWeekday(d, 4, 1) },
  { holiday: { name: 'Flag Day', message: 'Fifty stars, thirteen stripes.' }, match: d => fixed(d, 5, 14) },
  { holiday: { name: 'Juneteenth', message: 'Celebrating the end of slavery in the United States.' }, match: d => fixed(d, 5, 19) },
  { holiday: { name: 'Independence Day', message: 'Free from Great Britain since 1776.' }, match: d => fixed(d, 6, 4) },
  { holiday: { name: 'Labor Day', message: 'Honoring the American worker.' }, match: d => nthWeekday(d, 8, 1, 1) },
  { holiday: { name: 'Constitution Day', message: 'The supreme law of the land, signed 1787.' }, match: d => fixed(d, 8, 17) },
  { holiday: { name: 'Columbus Day', message: 'A day of exploration.' }, match: d => nthWeekday(d, 9, 1, 2) },
  { holiday: { name: 'Veterans Day', message: 'Honoring all who served.' }, match: d => fixed(d, 10, 11) },
  { holiday: { name: 'Thanksgiving', message: 'A day of gratitude since 1621.' }, match: d => nthWeekday(d, 10, 4, 4) },
  { holiday: { name: 'Christmas Day', message: 'Merry Christmas.' }, match: d => fixed(d, 11, 25) },
];

export function getTodaysHoliday(date: Date = new Date()): Holiday | null {
  return RULES.find(r => r.match(date))?.holiday ?? null;
}
```

2. `civic-app.ts` `connectedCallback()` template: between `<civic-topbar>` and `.app-body` insert nothing statically; after render, if `getTodaysHoliday()` returns one, insert a ribbon element right after the topbar:

```ts
const holiday = getTodaysHoliday();
if (holiday) {
  const ribbon = document.createElement('div');
  ribbon.className = 'holiday-ribbon';
  ribbon.setAttribute('role', 'note');
  ribbon.innerHTML = `<span class="holiday-ribbon-star">★</span> Happy ${holiday.name} <span class="holiday-ribbon-sep">—</span> ${holiday.message} <span class="holiday-ribbon-star">★</span>`;
  this.querySelector('civic-topbar')?.after(ribbon);
}
```

3. `civic-dashboard.ts`: in `render()`, `const holiday = getTodaysHoliday();` and the `<h1>` becomes `Happy ${holiday.name}, Citizen&#8209;to&#8209;be.` when a holiday is on (greeting time-of-day version otherwise).

4. CSS:

```css
.holiday-ribbon {
  text-align: center;
  padding: 7px 16px;
  background: linear-gradient(90deg, transparent, var(--gold-tint) 20%, var(--gold-tint) 80%, transparent);
  border-bottom: 1px solid var(--hairline-soft);
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--gold-text);
}
.holiday-ribbon-star { color: var(--red); }
.holiday-ribbon-sep { color: var(--hairline); text-transform: none; }
```

5. Verify: build exit 0. For visual proof, temporarily test via console by calling `getTodaysHoliday(new Date(2026, 6, 4))` — do NOT ship any date override. Commit: `feat: holiday ribbon and greeting on U.S. civic holidays`.

---

### Task 3: Mock-pass celebration (confetti + flags)

**Files:**
- Create: `src/components/shared/civic-celebration.ts`
- Modify: `src/components/views/civic-study.ts` (`completeSession()` mock pass/fail variant + blast)
- Modify: `src/styles/index.css` (`.celebration-canvas`)

**Steps:**

1. `civic-celebration.ts` — zero-dependency canvas confetti Web Component:

```ts
/**
 * <civic-celebration> — confetti + flags canvas burst.
 * Call blast() to fire. Respects prefers-reduced-motion (no-op).
 * Removes its canvas automatically when particles settle (~4s).
 */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number; size: number;
  kind: 'rect' | 'star' | 'flag';
  color: string;
}

const COLORS = ['#9E2B25', '#20345C', '#B08D3E', '#FFFDF7'];

export class CivicCelebration extends HTMLElement {
  private raf = 0;

  blast() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'celebration-canvas';
    canvas.width = innerWidth; canvas.height = innerHeight;
    this.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    const parts: Particle[] = [];
    const spawn = (cx: number, angle: number) => {
      for (let i = 0; i < 90; i++) {
        const speed = 8 + Math.random() * 9;
        const a = angle + (Math.random() - 0.5) * 0.9;
        const r = Math.random();
        parts.push({
          x: cx, y: innerHeight + 10,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.3,
          size: r > 0.9 ? 22 : 6 + Math.random() * 8,
          kind: r > 0.9 ? 'flag' : r > 0.72 ? 'star' : 'rect',
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    };
    spawn(innerWidth * 0.22, -Math.PI / 2 - 0.35);
    spawn(innerWidth * 0.78, -Math.PI / 2 + 0.35);
    setTimeout(() => spawn(innerWidth * 0.5, -Math.PI / 2), 350);

    const start = performance.now();
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of parts) {
        p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
        if (p.y < innerHeight + 40) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (p.kind === 'flag') {
          ctx.font = `${p.size}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🇺🇸', 0, 0);
        } else if (p.kind === 'star') {
          ctx.font = `${p.size * 1.6}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = p.color;
          ctx.fillText('★', 0, 0);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      if (alive && performance.now() - start < 6000) {
        this.raf = requestAnimationFrame(tick);
      } else {
        canvas.remove();
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  disconnectedCallback() { cancelAnimationFrame(this.raf); }
}

customElements.define('civic-celebration', CivicCelebration);
```

2. CSS:

```css
.celebration-canvas {
  position: fixed; inset: 0; z-index: 3000;
  pointer-events: none;
}
```

3. `civic-study.ts` `completeSession()`: import `'../shared/civic-celebration'`. After computing `ratings`/`mastered`, add the mock-pass logic — for `saved.type === 'mock'`: `const correct = ratings.filter(r => r >= 4).length; const passed = correct >= 12;` The overlay for mocks replaces the trophy block:
   - Passed: `🎉` → title `You Passed!` (Fraunces, `--gold-text` accent), line `You answered ${correct} of ${ratings.length} correctly — 12 is a passing score.`, and after inserting the overlay: create/append a `<civic-celebration>` (to `document.body`), call `.blast()`, and remove it after ~6s.
   - Failed: title `Keep Practicing`, line `You answered ${correct} of ${ratings.length} correctly — you need 12 to pass. You'll get there.` No confetti.
   - Non-mock sessions keep the existing "Session Complete!" overlay unchanged.

4. Verify: build exit 0. Commit: `feat: confetti-and-flags celebration on passing a mock interview`.

# Interview Countdown & Prep Punch Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Interview target date drives a daily mastery quota, an adaptive Daily Review size, and a punch-card tracker; a dialog prompts for the date on first visit and again when it expires.

**Architecture:** All plan math lives in the Store (`getDailyPlan()` + a `civic_punchlog_v1` BehaviorSubject persisted like the others). UI consumers (dashboard ledger line, punch-card rail box, session launcher count, settings row, prompt dialog) read the helper; the prompt and settings both funnel through one `Store.setInterviewDate()` mutator. Spec: `docs/superpowers/specs/2026-07-17-interview-countdown-design.md`.

**Tech Stack:** Vite 6, TS 5 strict, vanilla Web Components (Light DOM), RxJS 7 (`rxjs/internal/*` only), single stylesheet.

## Global Constraints

- Card IDs, question data, routes, existing custom events, component APIs unchanged. Mastery semantics unchanged (4+ mastered; 3+ interview-correct).
- Light DOM; ALL CSS in `src/styles/index.css`; tokens only (must look right in light AND dark themes); no new dependencies.
- RxJS imports from `rxjs/internal/*` sub-modules only.
- Existing localStorage keys unchanged in shape; settings merge must be backward-compatible (stored settings lacking the new fields load fine). Only new key: `civic_punchlog_v1`.
- Dates are LOCAL calendar dates — never `toISOString()` (UTC skew); use the `todayISO`/`daysBetween` helpers below everywhere.
- No test framework: the gate is `npm run build` exit 0 per task; the controller performs browser verification between tasks (do NOT start dev servers in subagent tasks).
- Quota rule (spec): `daysForQuota = max(1, daysBetween(today, interviewDate))`; `quota = remaining === 0 ? 0 : max(1, ceil(remaining / daysForQuota))`. Daily size = `min(40, max(10, quota + 6))`. A day is punched when its entry has `quota === 0 || mastered >= quota`.

---

### Task 1: Store — settings fields, punch log, plan math, adaptive daily

**Files:**
- Create: `src/utils/dates.ts`
- Modify: `src/types/index.ts` (AppSettings + DailyPlan + PunchLog types)
- Modify: `src/state/store.ts`

**Interfaces:**
- Produces (later tasks rely on these exact names):
  - `todayISO(d?: Date): string`, `daysBetween(fromISO: string, toISO: string): number` from `src/utils/dates.ts`
  - `AppSettings` gains `interviewDate: string | null; interviewDateIsDefault: boolean; prepStartDate: string | null;`
  - `DailyPlan` interface (in types) and `Store.getDailyPlan(): DailyPlan`
  - `Store.setInterviewDate(dateISO: string, isDefault: boolean): void`
  - `Store.getPunchLog(): PunchLog` (`PunchLog = Record<string, PunchDay>`, `PunchDay = { quota: number; mastered: number }`)
  - `createSession('daily')` sized to `getDailyPlan().dailySize`

- [ ] **Step 1: Create `src/utils/dates.ts`**

```ts
/** Local-calendar date helpers. Never use toISOString() for dates — UTC skew. */
export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole calendar days from fromISO to toISO (negative if toISO is earlier). */
export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return todayISO(dt);
}
```

- [ ] **Step 2: Types in `src/types/index.ts`**

Extend `AppSettings`:

```ts
export interface AppSettings {
  hideMastered: boolean;
  shuffleDefault: boolean;
  theme: 'light' | 'dark' | 'system';
  interviewDate: string | null;        // ISO YYYY-MM-DD, local calendar
  interviewDateIsDefault: boolean;     // true when set via "Skip — plan 1 month"
  prepStartDate: string | null;        // anchors the punch-card grid
}
```

Add:

```ts
export interface PunchDay { quota: number; mastered: number; }
export type PunchLog = Record<string, PunchDay>;

export interface DailyPlan {
  interviewDate: string | null;
  isDefault: boolean;
  daysLeft: number;        // daysBetween(today, interviewDate); 0 = interview day; negative = expired
  expired: boolean;        // daysLeft < 0
  quotaToday: number;
  masteredToday: number;
  dailySize: number;       // clamp(quotaToday + 6, 10, 40)
}
```

- [ ] **Step 3: Store changes in `src/state/store.ts`**

Imports: add `import { todayISO, daysBetween, addDaysISO } from '../utils/dates';` and add `PunchLog`, `PunchDay`, `DailyPlan` to the type import.

Keys and defaults:

```ts
const KEYS = {
  mastery: 'civic_mastery_v2',
  sessions: 'civic_sessions_v2',
  settings: 'civic_settings',
  punchlog: 'civic_punchlog_v1',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  hideMastered: false, shuffleDefault: false, theme: 'system',
  interviewDate: null, interviewDateIsDefault: false, prepStartDate: null,
};
```

(The settings BehaviorSubject already initializes with `{ ...DEFAULT_SETTINGS, ...load(KEYS.settings, {}) }` — the new fields ride the same merge. `resetAll()` must also remove `KEYS.punchlog` and next `punchlog$` to `{}`.)

New subject + persistence (alongside the others):

```ts
const punchlog$ = new BehaviorSubject<PunchLog>(load(KEYS.punchlog, {}));
punchlog$.subscribe(d => save(KEYS.punchlog, d));
```

Plan math (place after `isCardMastered`):

```ts
function remainingUnmastered(): number {
  const all = mastery$.getValue();
  return FLASHCARDS.filter(c => !(all[c.id] && all[c.id].masteryLevel >= 4)).length;
}

function computeQuota(remaining: number, daysForQuota: number): number {
  return remaining === 0 ? 0 : Math.max(1, Math.ceil(remaining / daysForQuota));
}

/** Ensure today's punch entry exists (only while a live, unexpired date is set). */
function ensureTodayEntry(): void {
  const s = settings$.getValue();
  if (!s.interviewDate) return;
  const today = todayISO();
  if (daysBetween(today, s.interviewDate) < 0) return; // expired — prompt will reset
  const log = punchlog$.getValue();
  if (log[today]) return;
  const daysForQuota = Math.max(1, daysBetween(today, s.interviewDate));
  punchlog$.next({ ...log, [today]: { quota: computeQuota(remainingUnmastered(), daysForQuota), mastered: 0 } });
}

function getDailyPlan(): DailyPlan {
  const s = settings$.getValue();
  const today = todayISO();
  const interviewDate = s.interviewDate;
  const daysLeft = interviewDate ? daysBetween(today, interviewDate) : 30;
  const expired = daysLeft < 0;
  if (interviewDate && !expired) ensureTodayEntry();
  const daysForQuota = Math.max(1, daysLeft);
  const quotaToday = expired ? 0 : computeQuota(remainingUnmastered(), daysForQuota);
  const masteredToday = punchlog$.getValue()[today]?.mastered ?? 0;
  const dailySize = Math.min(40, Math.max(10, quotaToday + 6));
  return { interviewDate, isDefault: s.interviewDateIsDefault, daysLeft, expired, quotaToday, masteredToday, dailySize };
}

/** Single mutator for the interview date — prompt and settings both use this. */
function setInterviewDate(dateISO: string, isDefault: boolean): void {
  const today = todayISO();
  updateSettings({ interviewDate: dateISO, interviewDateIsDefault: isDefault, prepStartDate: today });
  // Re-snapshot today's quota (overwrite quota, keep any mastered already earned today)
  const log = { ...punchlog$.getValue() };
  const daysForQuota = Math.max(1, daysBetween(today, dateISO));
  log[today] = { quota: computeQuota(remainingUnmastered(), daysForQuota), mastered: log[today]?.mastered ?? 0 };
  punchlog$.next(log);
}

function getPunchLog(): PunchLog {
  return punchlog$.getValue();
}
```

Crossing detection — in `setCardRating`, the function currently computes the new `card.masteryLevel` from the recent ratings. Capture the previous level before mutation and increment the log on a first crossing. Modify the function to:

```ts
function setCardRating(cardId: number, rating: number): CardMastery {
  const all = { ...mastery$.getValue() };
  const card = { ...(all[cardId] || defaultMastery()) };
  const prevLevel = card.masteryLevel;
  card.rating = rating;
  card.ratingHistory = [...card.ratingHistory, { rating, at: Date.now() }];
  card.reviewCount++;
  card.lastReviewedAt = Date.now();
  const recent = card.ratingHistory.slice(-5).map(r => r.rating);
  card.masteryLevel = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
  all[cardId] = card;
  mastery$.next(all);

  // Punch log: count first crossings into mastered (4+) toward today's quota
  if (prevLevel < 4 && card.masteryLevel >= 4) {
    const s = settings$.getValue();
    const today = todayISO();
    if (s.interviewDate && daysBetween(today, s.interviewDate) >= 0) {
      ensureTodayEntry();
      const log = { ...punchlog$.getValue() };
      log[today] = { ...log[today], mastered: log[today].mastered + 1 };
      punchlog$.next(log);
    }
  }
  return card;
}
```

Adaptive daily sizing — in `createSession`, the sized branch currently does `selected = shuffle(pool.slice(0, sessionType.cardCount))`. Change the count source:

```ts
    const count = type === 'daily' ? getDailyPlan().dailySize : sessionType.cardCount;
```

and use `count` in both the mock branch (`shuffle(pool).slice(0, count)` — for mock, `count` equals `sessionType.cardCount` since type !== 'daily'; simplest is to compute `count` once before the branches and use it in both `.slice(0, count)` calls).

`resetAll()` additions: `localStorage.removeItem(KEYS.punchlog); punchlog$.next({});` and reset settings to `DEFAULT_SETTINGS` (which now nulls the interview date — the prompt will re-appear, correct behavior).

Export from the `Store` object: `punchlog$, getDailyPlan, setInterviewDate, getPunchLog` (append to the existing export list).

- [ ] **Step 4: Build + verify**

Run: `npm run build` → exit 0.

Console sanity (controller does this in-browser after the task; implementer may skip): with a fresh profile, `Store.getDailyPlan()` returns `{interviewDate: null, daysLeft: 30, quotaToday: 5, dailySize: 11, ...}` (128 remaining / 30 → ceil = 5; 5+6=11).

- [ ] **Step 5: Commit**

```bash
git add src/utils/dates.ts src/types/index.ts src/state/store.ts
git commit -m "feat: interview-date plan math, punch log, adaptive daily sizing in store"
```

---

### Task 2: Prompt dialog + boot wiring + Settings row

**Files:**
- Create: `src/components/shared/interview-date-modal.ts`
- Modify: `src/components/app/civic-app.ts` (boot check)
- Modify: `src/components/views/civic-settings.ts` (Interview Date row)
- Modify: `src/styles/index.css` (`.interview-modal*` styles)

**Interfaces:**
- Consumes: `Store.getDailyPlan()`, `Store.setInterviewDate(dateISO, isDefault)`, `todayISO`, `addDaysISO` (Task 1).
- Produces: `<interview-date-modal>` element with `open(expired: boolean): void`; it self-removes after a choice. Dashboard (Task 3) re-renders via `Store.settings$` — no event contract needed.

- [ ] **Step 1: Create `src/components/shared/interview-date-modal.ts`**

```ts
/**
 * <interview-date-modal> — first-visit / expiry prompt for the interview date.
 * open(expired) shows the dialog; Escape/backdrop/skip = default 30-day plan.
 * Self-removes after any choice.
 */
import { Store } from '../../state/store';
import { todayISO, addDaysISO } from '../../utils/dates';

export class InterviewDateModal extends HTMLElement {
  open(expired: boolean) {
    const minDate = addDaysISO(todayISO(), 1);
    const defaultDate = addDaysISO(todayISO(), 30);
    this.innerHTML = `
      <dialog class="modal interview-modal" aria-label="Set your interview date">
        <div class="interview-modal-body">
          <div class="eyebrow">${expired ? 'A New Chapter' : 'Welcome, Future Citizen'}</div>
          <h2>${expired ? 'Your interview date has passed — set your next target.' : 'When is your naturalization interview?'}</h2>
          <p>We'll pace your studying so every question is mastered before the big day.</p>
          <input type="date" class="interview-date-input" min="${minDate}" value="${defaultDate}" aria-label="Interview date">
          <div class="interview-modal-actions">
            <button class="btn btn-navy" data-action="set">Set my date</button>
            <button class="btn btn-quiet" data-action="skip">Skip — plan 1 month for me</button>
          </div>
        </div>
      </dialog>
    `;

    const dialog = this.querySelector('dialog')!;
    const input = this.querySelector<HTMLInputElement>('.interview-date-input')!;

    const finish = (dateISO: string, isDefault: boolean) => {
      Store.setInterviewDate(dateISO, isDefault);
      dialog.close();
      this.remove();
    };
    const skip = () => finish(addDaysISO(todayISO(), 30), true);

    this.querySelector('[data-action="set"]')?.addEventListener('click', () => {
      const v = input.value;
      if (v && v >= minDate) finish(v, false); else skip();
    });
    this.querySelector('[data-action="skip"]')?.addEventListener('click', skip);
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); skip(); });          // Escape
    dialog.addEventListener('click', (e) => { if (e.target === dialog) skip(); });      // backdrop

    dialog.showModal();
  }
}

customElements.define('interview-date-modal', InterviewDateModal);
```

- [ ] **Step 2: Boot wiring in `civic-app.ts`**

Add `import '../shared/interview-date-modal';` with the other eager imports and `import type { InterviewDateModal } from '../shared/interview-date-modal';` — then a method called at the END of `connectedCallback()` (after `setupTheme()` etc.):

```ts
private setupInterviewPrompt() {
  const plan = Store.getDailyPlan();
  if (plan.interviewDate !== null && !plan.expired) return;
  const modal = document.createElement('interview-date-modal') as InterviewDateModal;
  document.body.appendChild(modal);
  modal.open(plan.expired && plan.interviewDate !== null);
}
```

(Note: `plan.expired` is only meaningful when a date exists; first-visit shows the welcome copy.)

- [ ] **Step 3: Settings row in `civic-settings.ts`**

Add as the FIRST `.setting-row` in the panel (above Theme):

```html
<div class="setting-row">
  <div>
    <div class="setting-row-title">Interview Date${settings.interviewDateIsDefault ? ' <span class="setting-row-note">(suggested)</span>' : ''}</div>
    <div class="setting-row-desc">Your study plan paces itself to this date</div>
  </div>
  <input type="date" class="interview-date-input" id="settings-interview-date"
         min="${addDaysISO(todayISO(), 1)}" value="${settings.interviewDate ?? ''}">
</div>
```

Handler (with the other listeners; imports: `todayISO, addDaysISO` from `../../utils/dates`):

```ts
this.querySelector('#settings-interview-date')?.addEventListener('change', (e) => {
  const v = (e.target as HTMLInputElement).value;
  if (v && v > todayISO()) {
    Store.setInterviewDate(v, false);
    this.render();
  }
});
```

- [ ] **Step 4: CSS in `index.css`** (near the `.modal` rules; tokens only)

```css
/* Interview date prompt */
.interview-modal { max-width: 420px; }
.interview-modal-body { padding: var(--sp-6); text-align: center; }
.interview-modal-body h2 {
  font-family: var(--font-display); font-size: 1.3rem; font-weight: 600;
  margin: 8px 0 6px; line-height: 1.3;
}
.interview-modal-body p { color: var(--ink-soft); font-size: 0.85rem; margin-bottom: var(--sp-4); }
.interview-modal-body .eyebrow { justify-content: center; }
.interview-date-input {
  font-family: var(--font-body); font-size: 0.9rem; color: var(--ink);
  background: var(--paper); border: 1px solid var(--hairline); border-radius: var(--radius-md);
  padding: 8px 12px; margin-bottom: var(--sp-4);
}
.interview-date-input:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }
.interview-modal-actions { display: flex; gap: var(--sp-3); justify-content: center; flex-wrap: wrap; }
.btn-quiet { background: none; color: var(--ink-soft); border-color: var(--hairline); }
.btn-quiet:hover { color: var(--ink); }
.setting-row-note { font-size: 0.7rem; font-weight: 500; color: var(--gold-text); }
```

- [ ] **Step 5: Build + verify**

`npm run build` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/interview-date-modal.ts src/components/app/civic-app.ts src/components/views/civic-settings.ts src/styles/index.css
git commit -m "feat: interview-date prompt on first visit and expiry; settings date row"
```

---

### Task 3: Dashboard — countdown line, adaptive counts, punch card

**Files:**
- Create: `src/components/shared/punch-card.ts`
- Modify: `src/components/views/civic-dashboard.ts`
- Modify: `src/styles/index.css` (`.countdown-line`, `.punch-*` styles)

**Interfaces:**
- Consumes: `Store.getDailyPlan()`, `Store.getPunchLog()`, `Store.settings$`, `daysBetween`, `addDaysISO`, `todayISO` (Task 1); `<interview-date-modal>` flow already updates settings (Task 2).
- Produces: `<punch-card>` element (renders from Store on connect; no inputs/events).

- [ ] **Step 1: Create `src/components/shared/punch-card.ts`**

```ts
/**
 * <punch-card> — prep punch-card grid: one cell per prep day.
 * ★ = quota met · dot = missed · outlined = today · ⚑ = interview day.
 */
import { Store } from '../../state/store';
import { todayISO, daysBetween, addDaysISO } from '../../utils/dates';

const WINDOW = 42; // show at most the trailing 6 weeks

export class PunchCard extends HTMLElement {
  connectedCallback() { this.render(); }

  private render() {
    const s = Store.getSettings();
    const log = Store.getPunchLog();
    const today = todayISO();
    if (!s.interviewDate || !s.prepStartDate || daysBetween(today, s.interviewDate) < 0) {
      this.innerHTML = '';
      return;
    }

    const totalDays = daysBetween(s.prepStartDate, s.interviewDate) + 1; // inclusive of interview day
    const clipped = Math.max(0, totalDays - WINDOW);
    const start = clipped > 0 ? addDaysISO(s.prepStartDate, clipped) : s.prepStartDate;
    const shown = totalDays - clipped;

    let cells = '';
    for (let i = 0; i < shown; i++) {
      const day = addDaysISO(start, i);
      const entry = log[day];
      const punched = !!entry && (entry.quota === 0 || entry.mastered >= entry.quota);
      const isToday = day === today;
      const isInterview = day === s.interviewDate;
      const isPast = daysBetween(day, today) > 0;
      const cls = ['punch-cell'];
      if (punched) cls.push('punched');
      if (isToday) cls.push('today');
      if (isInterview) cls.push('interview');
      if (!punched && isPast && !isInterview) cls.push('missed');
      const glyph = isInterview ? '⚑' : punched ? '★' : isPast ? '·' : '';
      cells += `<span class="${cls.join(' ')}" title="${day}">${glyph}</span>`;
    }

    this.innerHTML = `
      <div class="sidebar-box punch-box">
        <div class="sidebar-box-header">Prep Punch Card</div>
        ${clipped > 0 ? `<div class="punch-clip-note">+${clipped} earlier days</div>` : ''}
        <div class="punch-grid">${cells}</div>
      </div>
    `;
  }
}

customElements.define('punch-card', PunchCard);
```

- [ ] **Step 2: Dashboard changes in `civic-dashboard.ts`**

Imports: add `import '../shared/punch-card';` to the child-element imports, RxJS `import { Subject } from 'rxjs/internal/Subject';` + `import { takeUntil } from 'rxjs/internal/operators/takeUntil';`, and `import type { DailyPlan } from '../../types';` if needed.

In `render()`, before building the template: `const plan = Store.getDailyPlan();` and a countdown string:

```ts
const countdown = plan.interviewDate === null || plan.expired
  ? ''
  : plan.daysLeft === 0
    ? `<div class="countdown-line countdown-day">Interview day — you've got this.</div>`
    : `<div class="countdown-line"><strong>${plan.daysLeft} day${plan.daysLeft === 1 ? '' : 's'} to interview</strong>${plan.quotaToday > 0 ? ` · master ~${plan.quotaToday} a day` : ' · all 128 mastered!'}</div>`;
```

Template changes inside the existing Progress Ledger block:
- Insert `${countdown}` immediately AFTER the `.progress-ledger-big` div.
- Button text becomes `Start Daily Review · ${plan.dailySize} cards`.

After the `.sidebar-box` Mastery Trend block in `.dashboard-sidebar`, append `<punch-card></punch-card>`.

Adaptive launcher count — in `renderLaunchers()`, hand the daily launcher a sized copy:

```ts
private renderLaunchers() {
  const grid = this.querySelector('#session-grid')!;
  const dailySize = Store.getDailyPlan().dailySize;
  const types = Object.values(SESSION_TYPES);
  types.forEach(type => {
    const launcher = document.createElement('session-launcher') as InstanceType<typeof import('../shared/session-launcher').SessionLauncher>;
    launcher.sessionType = type.id === 'daily' ? { ...type, cardCount: dailySize } : type;
    grid.appendChild(launcher);
  });
}
```

Re-render when the plan changes (prompt closes / settings change): add `private destroy$ = new Subject<void>();`, a `disconnectedCallback() { this.destroy$.next(); }`, and at the end of `connectedCallback()`:

```ts
let lastKey = '';
Store.settings$.pipe(takeUntil(this.destroy$)).subscribe(s => {
  const key = `${s.interviewDate}|${s.prepStartDate}`;
  if (lastKey && key !== lastKey) this.render();
  lastKey = key;
});
```

(The guard avoids a redundant re-render on the initial emission.)

- [ ] **Step 3: CSS in `index.css`** (after the `.progress-ledger` rules)

```css
/* Countdown + punch card */
.countdown-line {
  padding: 10px 18px;
  border-bottom: 1px solid var(--hairline-soft);
  font-size: 0.8rem; color: var(--ink-soft);
}
.countdown-line strong { color: var(--ink); font-weight: 600; }
.countdown-day { color: var(--gold-text); font-weight: 600; }
.punch-clip-note { font-size: 0.68rem; color: var(--ink-soft); margin-bottom: 6px; }
.punch-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.punch-cell {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--hairline-soft); border-radius: 4px;
  font-size: 0.7rem; color: var(--ink-soft); background: var(--paper);
}
.punch-cell.punched { color: var(--gold); border-color: var(--gold-soft); background: var(--gold-tint); }
.punch-cell.missed { color: var(--hairline); }
.punch-cell.today { border: 2px solid var(--navy); }
.punch-cell.interview { color: var(--red); font-weight: 700; }
```

- [ ] **Step 4: Build + verify**

`npm run build` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/punch-card.ts src/components/views/civic-dashboard.ts src/styles/index.css
git commit -m "feat: countdown line, adaptive daily counts, prep punch card on dashboard"
```

---

## Controller browser verification (after all tasks)

Fresh profile (clear `civic_*` keys):
1. Prompt appears; "Skip" → dashboard shows "30 days to interview · master ~5 a day", Daily Review "11 cards", punch card grid with today outlined; Settings shows the date "(suggested)".
2. Clear keys; prompt → pick a near date (e.g. +5 days) → quota ≈ ceil(128/5)=26, daily size 32.
3. Drive first-crossings ≥ quota in one day (rate quota-many cards 5 twice each? one 5 sets EMA 5 → crossing on first rating) → today's cell turns gold ★.
4. Settings: change date → countdown + quota update; "(suggested)" note gone.
5. Expiry: `Store.updateSettings({interviewDate:'2026-07-01'})` + reload → expiry prompt appears; skip → fresh 30-day plan, fresh grid.
6. Both themes; mobile width (punch card in stacked rail).
7. Full study flow still works end-to-end; non-daily session sizes unchanged.

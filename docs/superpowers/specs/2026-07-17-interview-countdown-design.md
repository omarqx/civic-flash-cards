# Interview Countdown & Prep Punch Card — Design Spec

**Date:** 2026-07-17
**Status:** Approved
**Scope:** Target-date prep planning: first-visit interview-date prompt, adaptive Daily Review quota, and a punch-card tracker in the dashboard rail.

## Goal

Give the app a target: the user's naturalization interview date. The app turns the gap between today and that date into a daily mastery quota, resizes Daily Review to match, and tracks execution on a ration-book-style punch card. No date? The app assumes a 30-day prep.

## Data Model

### Settings (existing key `civic_settings`, backward-merged like the `theme` rollout)

| Field | Type | Meaning |
|---|---|---|
| `interviewDate` | `string \| null` | ISO date (`YYYY-MM-DD`) of the interview. `null` only before first prompt. |
| `interviewDateIsDefault` | `boolean` | True when the date came from "Skip — plan 1 month" rather than user input. Settings labels it "suggested". |
| `prepStartDate` | `string \| null` | ISO date the current prep period began (set whenever `interviewDate` is set or changed). Anchors the punch-card grid. |

Defaults for all three: `null` / `false` / `null`. Existing stored settings without these fields merge over defaults without error.

### Punch log (new key `civic_punchlog_v1`)

`Record<'YYYY-MM-DD', { quota: number; mastered: number }>`

- Today's entry is created on app boot (and re-snapshotted when the interview date changes): `quota = max(1, ceil(remainingUnmastered / daysLeft))` where `daysLeft` = calendar days from today up to but not including the interview date, minimum 1. If `remainingUnmastered` is 0, quota is 0.
- `mastered` increments inside the existing `Store.setCardRating` when a card **first crosses** into mastered (previous `masteryLevel < 4`, new `>= 4`). Cards dropping back below 4 never decrement past days — punch history is immutable; future quotas self-correct because they derive from live mastery counts.
- Days the app was never opened have no entry and render as missed.
- A punched day = entry with `mastered >= quota` and `quota > 0` (a 0-quota day punches automatically — nothing left to master).

## First-Visit / Expiry Prompt

A Federal Editorial–styled `<dialog>` (same treatment as the shortcuts modal) shown on boot when:

1. `interviewDate` is `null` (first visit — including existing users at rollout), **or**
2. `interviewDate` is in the past (expiry — title becomes "Your interview date has passed — set your next target").

Contents: short explanatory line, a native date input (`min` = tomorrow), and two actions:
- **Set my date** — stores the picked date, `interviewDateIsDefault: false`, `prepStartDate: today`.
- **Skip — plan 1 month for me** — stores today + 30 days, `interviewDateIsDefault: true`, `prepStartDate: today`.

Escape or backdrop click = skip (same +30 semantics, in both first-visit and expiry cases). Either path starts a fresh prep period: new `prepStartDate`, fresh punch grid (older log entries simply fall outside the grid; the log itself is not wiped).

## Adaptive Daily Review

`Store.createSession('daily')` sizes the session to `clamp(quotaToday + 6, 10, 40)` — the day's quota of new/weak cards plus ~6 review cards, never fewer than 10 nor more than 40. Card *selection* logic (spaced-repetition priority + shuffle) is unchanged; only the count adapts. The dashboard's Daily Review plan card and Progress Ledger button show the live count. Weekly / Monthly / Mock / Full sessions unchanged.

`SESSION_TYPES.daily.cardCount` remains 16 as data; the display and session creation use the computed size (a `Store.getDailyPlan()` helper returns `{ daysLeft, quotaToday, masteredToday, dailySize, interviewDate, isDefault }` for all consumers).

## Dashboard UI

In the Progress Ledger (right rail):
- **Countdown line** under the big numeral: "**23 days to interview** · master ~4 a day". Interview day itself: "Interview day — you've got this." (no quota shown).
- The "Start Daily Review" button reads "Start Daily Review · N cards".

Below the ledger, a new rail box — **Prep Punch Card** (`<punch-card>` Light-DOM component):
- Grid of day cells from `prepStartDate` through interview day, 7 per row.
- Cell states: gold ★ = quota met; small dim dot = past day, quota missed; today = outlined cell (and it gains its gold ★ the moment today's quota is met); empty = future; flag glyph (⚑) on the interview-day cell.
- Preps longer than 42 days: show the trailing 42-day window with a "+N earlier days" caption.
- Tokens only (works in light and dark themes).

## Settings

New row (above Theme): **Interview Date** — native date input showing the current date, "(suggested)" note when `interviewDateIsDefault`. Changing it sets `interviewDateIsDefault: false`, updates `prepStartDate` to today, and re-snapshots today's quota. No clear/remove control (a date always exists after the first prompt).

## Invariants

- Card IDs, question data, routes, custom events, existing component APIs unchanged.
- Light DOM; all CSS in `src/styles/index.css`; tokens only; no new dependencies.
- RxJS imports from `rxjs/internal/*` only.
- Existing localStorage keys unchanged in shape; the only new key is `civic_punchlog_v1`.
- Mock scoring, mastery semantics (4+ = mastered, 3+ = interview-correct) untouched.

## Verification

`npm run build` passes; browser-driven checks on a fresh profile: prompt set-path and skip-path; quota math against a known date; punch appears after driving quota-many first-crossings in one day; date change in Settings re-snapshots; expiry re-prompt (simulate by storing a past date); both themes; mobile width.

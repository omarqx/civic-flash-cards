# Structured Card Content — Design Spec

**Date:** 2026-07-17
**Status:** Approved
**Scope:** Replace the semicolon-string answer format with a typed rich-content card model, author explanations/hints/cross-links for all 128 cards, and render each surface accordingly.

## Problem

Answers are single strings with `"; "`-separated alternatives. 78 of 128 cards pack 2–25 acceptable answers into one blob (Q48 has 25), hiding the key fact that the officer usually needs only ONE. "Name two/three" requirements and "Answers will vary" guidance are buried in prose. Long answers overflow or truncate.

## Data Model

```ts
export interface Flashcard {
  id: number;            // official USCIS number — immutable (mastery key)
  q: string;             // unchanged
  cat: CategoryId;       // unchanged
  answers: string[];     // discrete acceptable answers (≥1), official wording
  requires: number;      // how many the officer asks for: 1–5 (Q81 "Name five")
  note?: string;         // guidance, e.g. "Answers will vary — visit senate.gov…"
  why?: string;          // 1–2 sentence factual explanation/context
  hint?: string;         // short memory hook
  related?: number[];    // cross-linked card ids (each must exist)
}
```

- `a: string` is REMOVED — full conversion, no legacy field or dual paths.
- `image?: string` is deliberately NOT added yet; the typed model makes it a trivial future addition.
- All 128 cards get `why` and `hint`; `related` only where genuinely helpful; `note` on the 8 user-specific cards. Those cards keep exactly one `answers` entry (the short variable-answer text, e.g. "Answers will vary by state"), with the bracketed guidance moved to `note` — so every card has ≥1 answer entry.

### File layout

- `src/data/cards/a.ts` … `src/data/cards/h.ts` — one file per category, each exporting `const CARDS_A: Flashcard[]` etc., with the official-range section comment.
- `src/data/flashcards.ts` — assembles `FLASHCARDS = [...CARDS_A, …, ...CARDS_H]`; keeps `CATEGORIES`, `SESSION_TYPES`, `STUDY_TIPS`, `CAT_CSS`, `CAT_COLORS`, `SESSION_BADGE_COLORS` unchanged.

### Conversion rules (from current data)

- Split current `a` on `"; "`; rejoin obvious false splits by hand (items containing unbalanced parentheses or that read as one phrase). Trailing period dropped from list items; single-answer cards keep their sentence form.
- `requires`: 2 for questions phrased "Name two…", 3 for "Name three…", else 1.
- The 8 "Answers will vary" cards: `answers: ["Answers will vary by state/district/current officeholder"]`-style single entry (short form), `requires: 1`, and the bracketed guidance moves to `note`.

### Authored content standards

- `why`: factual, neutral, 1–2 sentences, grounded in official USCIS study materials (M-1778 and uscis.gov study resources). No opinions, no editorializing on current politics.
- `hint`: one short mnemonic/association ("27 amendments — think '27 changes'"). Plain, not cutesy to the point of noise.
- `related`: ids of cards a learner should study together (e.g., the three-branches cluster, the two-senators/six-year-term pair). Sparse by design.
- Content lands in per-category commits so each batch is independently reviewable for factual accuracy.

## Rendering

### Study flashcard (back face)

- 1 answer: current presentation (large serif line).
- 2+ answers: a small caption above the list — `requires === 1` → "ANY ONE OF:", `2` → "NAME TWO:", `3` → "NAME THREE:" — then a compact list (serif, smaller than the single-answer size). More than 8 items → two columns; the existing max-height + scroll stays as overflow safety.
- `hint` renders below the answers as one italic line with a small gold "Hint —" prefix.
- `note` (user-specific cards) renders as the italic guidance line instead of a hint.
- `why`/`related` do NOT render on the study card (kept focused); they live in the detail modal.

### Library tile

- Answer preview = first answer; if more, a small "+N more" tag styled like the existing footer labels. Replaces the truncated blob.

### Card detail modal

- Answers as a list with the same requires-caption; `why` as a "Why" section paragraph; `hint` as an italic line; `note` where present; `related` as clickable "See also: No. 14, No. 16" links that swap the modal to that card (reusing the existing `cardId` setter).

### Search (library)

Matches against `q`, every entry of `answers`, and `why`. (Category-name matching stays.)

## Invariants

- Card ids, question text, categories, mastery/localStorage keys, routes, custom events, session logic, mock scoring: unchanged.
- Light DOM; all CSS in `src/styles/index.css`; tokens only (light + dark); no new dependencies; RxJS internal imports only.
- Answer CONTENT remains the official wording — restructured, not rewritten (authored `why`/`hint` are additions, not replacements).

## Verification

- Scripted data audit (run in CI-less repo as a node script during implementation, committed under `scripts/`): exactly 128 cards; ids 1–128 unique; every card `answers.length ≥ 1`, `1 ≤ requires ≤ 5`, `requires ≤ answers.length`, every `related` id exists and no self-links; every card has non-empty `why` and `hint`.
- `npm run build` passes.
- Browser checks: Q48 renders as an in-frame two-column list with "Name two:"; Q126 (three holidays) shows "NAME THREE:"; a user-specific card shows its note; library tiles show "+N more"; detail modal shows why/hint/related and related-links navigate; search finds a card by an answer word and by a why-word; both themes; mobile.
- Factual review: each category batch's why/hint content reviewed against official USCIS study materials before commit.

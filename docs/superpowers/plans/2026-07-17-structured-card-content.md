# Structured Card Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace semicolon-string answers with a typed rich card model (`answers[]`, `requires`, `note`, `why`, `hint`, `related`), author explanations/hints for all 128 cards, and render every surface accordingly.

**Architecture:** Task 1 is the atomic cutover: new `Flashcard` type, mechanical conversion of all 128 cards into per-category files, all four consumers updated, audit script added. Tasks 2–4 author `why`/`hint`/`related` content in three reviewable batches (additive, optional fields — no code changes). Task 5 flips the audit to strict and updates docs. Spec: `docs/superpowers/specs/2026-07-17-structured-card-content-design.md`.

**Tech Stack:** Vite 6, TS 5 strict, vanilla Web Components (Light DOM), single stylesheet, Node 24 (native TS type-stripping runs the audit script).

## Global Constraints

- Card `id`s, `q` text, `cat` assignments, mastery/localStorage keys, routes, events, session logic: unchanged. Answer CONTENT keeps official wording — restructured, never rewritten.
- `a: string` is fully removed — no legacy field, no dual code paths. Grep for `\.a\b` on Flashcard consumers must come up empty after Task 1.
- Light DOM; ALL CSS in `src/styles/index.css`; tokens only (light + dark); no new dependencies; RxJS internal imports only.
- Authored `why`: factual, neutral, 1–2 sentences, grounded in official USCIS study materials; `hint`: one short memory hook; `related`: sparse, only genuinely-connected cards. No editorializing.
- Audit gate: `node scripts/audit-cards.ts` (structural always; `--require-content` from Task 5). Build gate: `npm run build` exit 0 per task. Controller does browser verification.
- Card counts per category: A 15, B 47, C 10, D 17, E 10, F 19, G 6, H 4.

---

### Task 1: Model cutover — types, converted data files, all consumers, audit script

**Files:**
- Modify: `src/types/index.ts` (Flashcard interface)
- Create: `src/data/cards/a.ts` … `src/data/cards/h.ts` (8 files)
- Modify: `src/data/flashcards.ts` (assembler; FLASHCARDS array removed from this file)
- Modify: `src/components/shared/flash-card.ts`, `src/components/shared/card-brutal.ts`, `src/components/shared/card-detail-modal.ts`, `src/components/views/civic-library.ts`
- Modify: `src/styles/index.css`
- Create: `scripts/audit-cards.ts`

**Interfaces (later tasks rely on these exact shapes):**

```ts
// src/types/index.ts — replaces the current Flashcard interface
export interface Flashcard {
  id: number;            // official USCIS number — immutable (mastery key)
  q: string;
  cat: CategoryId;
  answers: string[];     // discrete acceptable answers (≥1), official wording
  requires: number;      // how many the officer asks for: 1, 2, or 3
  note?: string;         // guidance for user-specific answers
  why?: string;          // 1–2 sentence factual explanation (authored Tasks 2–4)
  hint?: string;         // short memory hook (authored Tasks 2–4)
  related?: number[];    // cross-linked card ids
}
```

Each `src/data/cards/<x>.ts` exports `export const CARDS_A: Flashcard[] = [...]` (B→`CARDS_B`, etc.) with the official-range header comment, e.g. `// ===== A: Principles of American Democracy (1–15) =====`. `src/data/flashcards.ts` gains:

```ts
import { CARDS_A } from './cards/a';
import { CARDS_B } from './cards/b';
import { CARDS_C } from './cards/c';
import { CARDS_D } from './cards/d';
import { CARDS_E } from './cards/e';
import { CARDS_F } from './cards/f';
import { CARDS_G } from './cards/g';
import { CARDS_H } from './cards/h';

export const FLASHCARDS: Flashcard[] = [
  ...CARDS_A, ...CARDS_B, ...CARDS_C, ...CARDS_D,
  ...CARDS_E, ...CARDS_F, ...CARDS_G, ...CARDS_H,
];
```

(CATEGORIES, SESSION_TYPES, STUDY_TIPS, CAT_CSS, CAT_COLORS, SESSION_BADGE_COLORS stay in flashcards.ts unchanged.)

- [ ] **Step 1: Convert the data.** For each current card, split `a` on `"; "` into `answers`, then hand-review every card while converting:
  - Drop the trailing period from multi-item lists; single-answer cards keep their sentence form.
  - Re-join false splits (an item that is not independently a complete acceptable answer — e.g. text inside one phrase). Parenthetical variants like `"(U.S.) Congress"` stay within their item.
  - `requires`: 2 where the question asks to name TWO of a larger set (e.g. Q10 two ideas, Q67 two Oath promises), 3 for "Name three national U.S. holidays" (Q126), else 1. Compound single answers ("The Senate and House") are ONE answer with `requires: 1`.
  - The 8 "Answers will vary" cards (Q23/29/30/38/39/57/61/62): `answers` = one short entry (e.g. `"Answers will vary by state"`), `requires: 1`, bracketed guidance → `note` (strip the brackets).
  - Do NOT add `why`/`hint`/`related` in this task.

Example conversions (transcribe this style exactly):

```ts
{ id: 2, q: "What is the supreme law of the land?", cat: "A",
  answers: ["The (U.S.) Constitution"], requires: 1 },
{ id: 6, q: "What does the Bill of Rights protect?", cat: "A",
  answers: ["(The basic) rights of Americans", "(The basic) rights of people living in the United States"], requires: 1 },
{ id: 126, q: "Name three national U.S. holidays.", cat: "H",
  answers: ["New Year's Day", "Martin Luther King, Jr. Day", "Presidents Day (Washington's Birthday)", "Memorial Day", "Independence Day", "Labor Day", "Columbus Day", "Veterans Day", "Thanksgiving Day", "Christmas Day"], requires: 3 },
{ id: 23, q: "Who is one of your state's U.S. senators now?", cat: "B",
  answers: ["Answers will vary by state"], requires: 1,
  note: "Visit senate.gov. D.C. residents and residents of U.S. territories should answer that D.C. (or the territory) has no U.S. senators." },
```

- [ ] **Step 2: `scripts/audit-cards.ts`** (run with plain `node scripts/audit-cards.ts` — Node 24 strips types natively; import the 8 card files directly WITH `.ts` extensions; they have only type-only imports so they run dependency-free):

```ts
import { CARDS_A } from '../src/data/cards/a.ts';
import { CARDS_B } from '../src/data/cards/b.ts';
import { CARDS_C } from '../src/data/cards/c.ts';
import { CARDS_D } from '../src/data/cards/d.ts';
import { CARDS_E } from '../src/data/cards/e.ts';
import { CARDS_F } from '../src/data/cards/f.ts';
import { CARDS_G } from '../src/data/cards/g.ts';
import { CARDS_H } from '../src/data/cards/h.ts';

const requireContent = process.argv.includes('--require-content');
const all = [...CARDS_A, ...CARDS_B, ...CARDS_C, ...CARDS_D, ...CARDS_E, ...CARDS_F, ...CARDS_G, ...CARDS_H];
const errors: string[] = [];

if (all.length !== 128) errors.push(`expected 128 cards, got ${all.length}`);
const ids = new Set(all.map(c => c.id));
if (ids.size !== all.length) errors.push('duplicate ids');
for (let i = 1; i <= 128; i++) if (!ids.has(i)) errors.push(`missing id ${i}`);

const RANGES: Record<string, [number, number]> = { A: [1,15], B: [16,62], C: [63,72], D: [73,89], E: [90,99], F: [100,118], G: [119,124], H: [125,128] };
for (const c of all) {
  const [lo, hi] = RANGES[c.cat] ?? [0, -1];
  if (c.id < lo || c.id > hi) errors.push(`card ${c.id}: cat ${c.cat} out of official range`);
  if (!c.answers || c.answers.length < 1) errors.push(`card ${c.id}: no answers`);
  if (c.answers.some(a => !a.trim())) errors.push(`card ${c.id}: empty answer entry`);
  if (c.requires < 1 || c.requires > 3) errors.push(`card ${c.id}: requires ${c.requires}`);
  if (c.requires > c.answers.length) errors.push(`card ${c.id}: requires > answers`);
  for (const r of c.related ?? []) {
    if (r === c.id) errors.push(`card ${c.id}: self-link`);
    if (!ids.has(r)) errors.push(`card ${c.id}: related ${r} does not exist`);
  }
  if (requireContent) {
    if (!c.why?.trim()) errors.push(`card ${c.id}: missing why`);
    if (!c.hint?.trim() && !c.note?.trim()) errors.push(`card ${c.id}: missing hint`);
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`audit ok: 128 cards${requireContent ? ' with full content' : ''}`);
```

- [ ] **Step 3: `flash-card.ts` back face.** Replace the answer block:

```ts
const caption = card.answers.length > 1
  ? card.requires === 3 ? 'Name three:' : card.requires === 2 ? 'Name two:' : 'Any one of:'
  : '';
const answersHtml = card.answers.length === 1
  ? `<div class="flashcard-answer ${card.answers[0].length > 220 ? 'long' : ''}">${card.answers[0]}</div>`
  : `<div class="flashcard-answers ${card.answers.length > 8 ? 'cols' : ''}">${
      card.answers.map(a => `<div class="flashcard-answer-item">${a}</div>`).join('')
    }</div>`;
const footnote = card.note
  ? `<div class="flashcard-footnote">${card.note}</div>`
  : card.hint
    ? `<div class="flashcard-footnote"><span class="flashcard-footnote-label">Hint —</span> ${card.hint}</div>`
    : '';
```

Back face body becomes: eyebrow "Answer", then `${caption ? `<div class="flashcard-answers-caption">${caption}</div>` : ''}`, then a scroll wrapper `<div class="flashcard-answer-wrap">${answersHtml}</div>`, then `${footnote}`. Front face unchanged.

- [ ] **Step 4: `card-brutal.ts` tile.** Replace the desc line:

```ts
const more = card.answers.length > 1 ? ` <span class="card-more-tag">+${card.answers.length - 1} more</span>` : '';
// ...
<div class="card-brutal-desc">${card.answers[0]}${more}</div>
```

- [ ] **Step 5: `card-detail-modal.ts`.** Answer section becomes the caption + a `<ul class="card-detail-answers">` of answers; add sections rendered only when present:

```ts
${card.why ? `<div class="card-detail-section"><div class="card-detail-section-title">Why</div><div class="card-detail-section-content">${card.why}</div></div>` : ''}
${card.hint ? `<div class="card-detail-section"><div class="card-detail-section-title">Hint</div><div class="card-detail-section-content card-detail-hint">${card.hint}</div></div>` : ''}
${card.note ? `<div class="card-detail-section"><div class="card-detail-section-title">Note</div><div class="card-detail-section-content">${card.note}</div></div>` : ''}
${card.related?.length ? `<div class="card-detail-section"><div class="card-detail-section-title">See also</div><div>${card.related.map(r => `<button class="related-link" data-related="${r}">No. ${r}</button>`).join(' ')}</div></div>` : ''}
```

Wire related links after render: `this.querySelectorAll('.related-link').forEach(b => b.addEventListener('click', () => { this.cardId = Number((b as HTMLElement).dataset.related); }));`

- [ ] **Step 6: `civic-library.ts` search.** Replace the `c.a` match with:

```ts
c.q.toLowerCase().includes(q) ||
c.answers.some(a => a.toLowerCase().includes(q)) ||
(c.why ?? '').toLowerCase().includes(q) ||
CATEGORIES[c.cat].name.toLowerCase().includes(q)
```

- [ ] **Step 7: Sweep remaining `.a` consumers.** `grep -rn "\.a\b" src/` and fix any stragglers (expected: none beyond the four files above; `card.a` in civic-study does not exist — verify).

- [ ] **Step 8: CSS** (near the flashcard rules; tokens only):

```css
.flashcard-answers-caption {
  font-size: 0.66rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--gold-text); margin-bottom: 8px;
}
.flashcard-answer-wrap { max-height: 230px; overflow-y: auto; width: 100%; padding: 0 var(--sp-6); }
.flashcard-answers { display: block; text-align: center; }
.flashcard-answers.cols { column-count: 2; column-gap: var(--sp-5); text-align: left; }
.flashcard-answer-item {
  font-family: var(--font-display); font-size: 1.05rem; line-height: 1.4;
  break-inside: avoid; padding: 2px 0;
}
.flashcard-footnote {
  margin-top: var(--sp-4); font-family: var(--font-display); font-style: italic;
  font-size: 0.82rem; color: var(--ink-soft); max-width: 460px;
}
.flashcard-footnote-label { color: var(--gold-text); font-style: normal; font-weight: 600; }
.card-more-tag {
  font-size: 0.68rem; font-weight: 600; color: var(--gold-text);
  background: var(--gold-tint); border-radius: 4px; padding: 1px 6px; white-space: nowrap;
}
.card-detail-answers { list-style: none; display: flex; flex-direction: column; gap: 4px; }
.card-detail-answers li { padding-left: 14px; position: relative; }
.card-detail-answers li::before { content: '★'; position: absolute; left: 0; font-size: 0.6rem; color: var(--gold-soft); top: 5px; }
.card-detail-hint { font-style: italic; }
.related-link {
  font-family: var(--font-display); font-style: italic; font-size: 0.85rem;
  color: var(--navy); background: none; border: 1px solid var(--hairline);
  border-radius: var(--radius-md); padding: 3px 10px; cursor: pointer;
}
.related-link:hover { border-color: var(--gold); color: var(--gold-text); }
```

Also adjust `.flashcard-answer` existing rule: remove its own `max-height`/`overflow-y` (the wrap owns scrolling now); keep the `.long` font-size variant.

- [ ] **Step 9: Verify.** `node scripts/audit-cards.ts` → "audit ok: 128 cards". `npm run build` → exit 0.

- [ ] **Step 10: Commit.** `git add -A src/ scripts/ && git commit -m "feat: structured card content model — answers list, requires, notes"`

---

### Tasks 2–4: Author why/hint/related content (three batches)

Same shape for each; only the categories differ:

| Task | Files | Cards |
|---|---|---|
| 2 | `src/data/cards/a.ts`, `c.ts`, `g.ts`, `h.ts` | A 1–15, C 63–72, G 119–124, H 125–128 (35 cards) |
| 3 | `src/data/cards/b.ts` | B 16–62 (47 cards) |
| 4 | `src/data/cards/d.ts`, `e.ts`, `f.ts` | D 73–89, E 90–99, F 100–118 (46 cards) |

**Steps for each batch:**

- [ ] **Step 1: Author content.** For every card in the batch add `why` and `hint` (note-cards may skip `hint` — the note serves that role), and `related` where genuinely connected. Standards (binding):
  - `why`: 1–2 sentences, factual, neutral, grounded in official USCIS study materials (M-1778 study guide / uscis.gov citizenship resources — use WebSearch/WebFetch to confirm any fact you are not certain of, especially dates and numbers). It explains context, never replaces the answer. Example: `why: "The Constitution, written in 1787, is the highest law — every other law, state or federal, must comply with it."`
  - `hint`: one short memory hook. Example: `hint: "Supreme law = the one law above all others."` For numbers use anchor tricks: `hint: "27 amendments — 2 houses + 7 articles? No — just remember '27 changes'."` is TOO cute; prefer plain: `hint: "Twenty-seven — one more than 26."`-style only when it truly helps; a simple association beats a forced mnemonic.
  - `related`: 0–3 ids per card, only for true study clusters (three-branches cards → each other; senators-count ↔ senator-term; Declaration cards ↔ each other). No reciprocity requirement, no padding.
  - Do not modify `q`, `answers`, `requires`, `note`, ids, or any code.
- [ ] **Step 2: Verify.** `node scripts/audit-cards.ts` (structural — related ids must resolve) and `npm run build` → both clean.
- [ ] **Step 3: Commit.** `git commit -m "content: why/hint/related for categories <X>"`

**Review requirement (controller):** each batch's reviewer must have web access and fact-check a sample of ≥10 `why` entries against official USCIS study materials, plus every date/number claim in the batch.

---

### Task 5: Strict audit + docs

**Files:** `package.json` (audit npm script), `README.md`, `scripts/audit-cards.ts` (no change expected — just run strict)

- [ ] **Step 1:** Add to package.json scripts: `"audit:cards": "node scripts/audit-cards.ts --require-content"`. Run it — must pass (fix any content stragglers in the data files if not).
- [ ] **Step 2:** README: update the Project Structure tree (`src/data/cards/a–h.ts` + one-line description) and add a "Card content" paragraph: answers are stored as discrete acceptable options with `requires`, plus authored explanations/hints grounded in official USCIS materials.
- [ ] **Step 3:** `npm run build` → exit 0. Commit: `git commit -m "chore: strict card-content audit script and docs"`

---

## Controller browser verification (after all tasks)

1. Study Q48 (single-card from library): "Any one of:" caption, two-column scrollable list, in frame.
2. Q126: "Name three:" caption.
3. A note-card (Q38): note line renders on the back, no hint label.
4. Any card: hint renders as italic gold-labeled line.
5. Library tiles: first answer + "+N more" tag; search "senate" (answer word) and a why-only word both filter correctly.
6. Detail modal: answers list with ★ bullets, Why/Hint sections, related links swap the modal card.
7. Both themes; mobile; full study flow + mock still work end-to-end.

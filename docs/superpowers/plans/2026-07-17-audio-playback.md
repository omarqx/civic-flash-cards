# Audio Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-generated TTS narration for all 128 cards, with a hands-free Listen mode (q → recall gap → a → auto-advance, synced card flip, segmented player bar) and a per-card read-aloud button in scored practice mode.

**Architecture:** A Node/tsx script calls a local Kokoro TTS server at authoring time and commits MP3s + a hash/duration manifest to `public/audio/`. At runtime a singleton RxJS service (`AudioPlayer`) drives one shared `HTMLAudioElement` through a per-card phase machine; the study view hosts a Study|Listen toggle, a `<listen-player-bar>` component, and a speaker button on `<flash-card>`. Listening never writes ratings, mastery, or sessions.

**Tech Stack:** Vite 6 + vite-plugin-pwa (Workbox), vanilla Web Components (Light DOM), RxJS via `rxjs/internal/*` only, TypeScript strict. New devDeps: `vitest`, `tsx`, `music-metadata`.

**Spec:** `docs/superpowers/specs/2026-07-17-audio-playback-design.md`

## Global Constraints

- Card IDs are immutable localStorage mastery keys — never renumber cards in `src/data/flashcards.ts`.
- Light DOM only; ALL CSS goes in `src/styles/index.css` (Federal Editorial tokens: `--navy`, `--gold`, `--gold-text`, `--hairline`, `--surface`, `--shadow-soft`, `--font-body`, `--font-display`).
- RxJS imports ONLY from `rxjs/internal/*` sub-modules — never barrel `rxjs` or `rxjs/operators`.
- Gold used as text color must be `--gold-text` (AA contrast), not `--gold`.
- Listening is purely passive: no code path from `audio-player.ts` or listen mode may call `Store.setCardRating` or `Store.saveSession`.
- Audio generation is manual (`npm run generate:audio`) — never part of `npm run build`.
- Clip filenames use immutable card ids: `public/audio/q-<id>.mp3`, `a-<id>.mp3`.
- TTS endpoint: `POST ${TTS_URL}/v1/audio/speech` (default `http://localhost:8880`), OpenAI-compatible; default voice `af_heart` via `TTS_VOICE`.
- Type-check gate for every task: `npx tsc --noEmit` passes.

---

### Task 1: Tooling, types, and settings defaults

**Files:**
- Modify: `package.json`
- Modify: `src/types/index.ts`
- Modify: `src/state/store.ts:28` (DEFAULT_SETTINGS)
- Create: `src/vite-env.d.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: all shared audio types (`ClipKind`, `AudioClipMeta`, `AudioManifest`, `ListenPhase`, `ListenQueueItem`, `ListenQueue`, `PlayerStatus`, `PlayerPosition`), `AppSettings.playbackRate: number` and `AppSettings.recallGapSeconds: number` with defaults `1` and `5`, npm scripts `test` and `generate:audio`, `import.meta.env` typing.

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest tsx music-metadata
```

- [ ] **Step 2: Add npm scripts**

In `package.json`, extend `"scripts"`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "generate:audio": "tsx scripts/generate-audio.ts"
}
```

- [ ] **Step 3: Add audio types**

Append to `src/types/index.ts`:

```ts
// ── Audio playback ──

export type ClipKind = 'q' | 'a';

export interface AudioClipMeta {
  hash: string;      // sha256 of voice + final spoken text
  duration: number;  // seconds, measured at generation time
}

/** Keys are clip names: "q-17", "a-17". */
export type AudioManifest = Record<string, AudioClipMeta>;

export type ListenPhase = 'question' | 'gap' | 'answer';

export interface ListenQueueItem {
  cardId: number;
  qDuration: number;   // raw seconds at 1× (0 if clip missing)
  aDuration: number;   // raw seconds at 1× (0 if clip missing)
  gap: number;         // wall-clock seconds
  total: number;       // seconds at the queue's rate, incl. gap
  startOffset: number; // seconds from queue start, at the queue's rate
}

export interface ListenQueue {
  items: ListenQueueItem[];
  totalDuration: number; // seconds at the queue's rate
  gapSeconds: number;
  rate: number;
}

export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'complete';

export interface PlayerPosition {
  cardIndex: number;
  phase: ListenPhase;
  cardElapsed: number;    // seconds into the current card
  totalElapsed: number;   // seconds into the whole queue
  phaseRemaining: number; // seconds left in the current phase (drives the gap countdown)
}
```

And extend `AppSettings`:

```ts
export interface AppSettings {
  hideMastered: boolean;
  shuffleDefault: boolean;
  theme: 'light' | 'dark' | 'system';
  playbackRate: number;      // 0.75–1.5, default 1
  recallGapSeconds: number;  // 3 | 5 | 8, default 5
}
```

- [ ] **Step 4: Update DEFAULT_SETTINGS**

In `src/state/store.ts` line 28:

```ts
const DEFAULT_SETTINGS: AppSettings = { hideMastered: false, shuffleDefault: false, theme: 'system', playbackRate: 1, recallGapSeconds: 5 };
```

(The existing `{ ...DEFAULT_SETTINGS, ...load(...) }` spread already fills the new keys for users with stored settings.)

- [ ] **Step 5: Create `src/vite-env.d.ts`** (typing for `import.meta.env.BASE_URL`, used in Task 5)

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx vitest run --passWithNoTests` — expected: exits 0, "No test files found".

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/types/index.ts src/state/store.ts src/vite-env.d.ts
git commit -m "feat: audio playback types, settings defaults, and test tooling"
```

---

### Task 2: Spoken-text transform + clip hash (TDD)

**Files:**
- Create: `scripts/lib/spoken-text.ts`
- Test: `tests/spoken-text.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `speakText(text: string): string` (mechanical fallback transform) and `clipHash(spokenText: string, voice: string): string` (sha256 hex). Used by Task 4 (script) and Task 3 (validation tests).

Note: `scripts/` and `tests/` are outside `tsconfig.json`'s `include` — they are type-checked by vitest/tsx at run time, not by `npm run build`. That is intentional: the app bundle never imports from `scripts/`.

- [ ] **Step 1: Write the failing tests**

Create `tests/spoken-text.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { speakText, clipHash } from '../scripts/lib/spoken-text';

describe('speakText', () => {
  it('strips bracketed editorial notes (card 23)', () => {
    const input = 'Answers will vary by state. [Visit senate.gov. D.C. residents and residents of U.S. territories should answer that D.C. (or the territory) has no U.S. senators.]';
    expect(speakText(input)).toBe('Answers will vary by state.');
  });

  it('strips parenthetical duplications, keeping the spoken form (card 7)', () => {
    expect(speakText('Twenty-seven (27).')).toBe('Twenty-seven.');
  });

  it('strips leading parenthetical qualifiers (card 6)', () => {
    expect(speakText('(The basic) rights of Americans; (the basic) rights of people living in the United States.'))
      .toBe('rights of Americans. rights of people living in the United States.');
  });

  it('converts semicolon lists to sentence breaks (card 16)', () => {
    expect(speakText('Legislative, executive, and judicial; Congress, president, and the courts.'))
      .toBe('Legislative, executive, and judicial. Congress, president, and the courts.');
  });

  it('collapses whitespace and orphaned punctuation', () => {
    expect(speakText('The Senate and House (of Representatives).')).toBe('The Senate and House.');
  });
});

describe('clipHash', () => {
  it('is stable for identical input', () => {
    expect(clipHash('Twenty-seven.', 'af_heart')).toBe(clipHash('Twenty-seven.', 'af_heart'));
  });
  it('changes when text changes', () => {
    expect(clipHash('Twenty-seven.', 'af_heart')).not.toBe(clipHash('Twenty-eight.', 'af_heart'));
  });
  it('changes when voice changes', () => {
    expect(clipHash('Twenty-seven.', 'af_heart')).not.toBe(clipHash('Twenty-seven.', 'af_bella'));
  });
  it('is a 64-char hex sha256', () => {
    expect(clipHash('x', 'v')).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/spoken-text.test.ts`
Expected: FAIL — cannot resolve `../scripts/lib/spoken-text`.

- [ ] **Step 3: Implement**

Create `scripts/lib/spoken-text.ts`:

```ts
/**
 * Pure text logic for audio generation.
 * speakText: mechanical fallback used when a card has no hand-authored
 * spoken answer in src/data/spoken-answers.ts. Questions are read verbatim
 * and never pass through this transform.
 */
import { createHash } from 'node:crypto';

export function speakText(text: string): string {
  return text
    .replace(/\s*\[[^\]]*\]/g, '')   // [bracketed editorial notes]
    .replace(/\s*\([^)]*\)/g, '')    // (parenthetical alternates/abbreviations)
    .replace(/;/g, '.')              // list separators → sentence breaks
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();
}

export function clipHash(spokenText: string, voice: string): string {
  return createHash('sha256').update(`${voice}\n${spokenText}`).digest('hex');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/spoken-text.test.ts`
Expected: PASS (9 tests). If a fixture disagrees with the implementation on minor whitespace, fix the implementation, not the expectation, unless the expectation is clearly wrong.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/spoken-text.ts tests/spoken-text.test.ts
git commit -m "feat: spoken-text fallback transform and clip hashing"
```

---

### Task 3: Hand-authored spoken answers for all 128 cards

**Files:**
- Create: `src/data/spoken-answers.ts`
- Test: `tests/spoken-answers.test.ts`

**Interfaces:**
- Consumes: `FLASHCARDS` from `src/data/flashcards.ts`.
- Produces: `SPOKEN_ANSWERS: Record<number, string>` — card id → spoken answer script. Task 4 uses `SPOKEN_ANSWERS[id] ?? speakText(card.a)`.

**Authoring rules (from the approved spec):**
1. State what the question demands when it asks for N of a list: "You need to name three. You could say: …".
2. Give a natural best answer first, then alternates conversationally: "Other good answers include …".
3. Never include brackets, parentheses, semicolons, URLs read as URLs (say "check senate dot gov" style only when genuinely useful), or markup.
4. For "answers will vary" cards (23, 29, 30, 38, 39, 43, 44, 61 — verify by grepping `Answers will vary` and `[Visit`), be honest and useful: e.g. card 23 → "This depends on your state. Check senate dot gov to find your two current U.S. senators. If you live in D.C. or a U.S. territory, say that you have no U.S. senators."
5. Short factual answers stay short: card 7 → "Twenty-seven."
6. Every entry ends with terminal punctuation.

**Worked examples (write these exact entries, then the remaining 122 in the same register):**

```ts
export const SPOKEN_ANSWERS: Record<number, string> = {
  2: 'The Constitution. It is the supreme law of the land.',
  7: 'Twenty-seven.',
  16: 'The legislative, executive, and judicial branches. In other words: Congress, the President, and the courts.',
  23: 'This depends on your state. Check senate dot gov to find your two current U.S. senators. If you live in D.C. or a U.S. territory, say that you have no U.S. senators.',
  27: 'Two. Every state has two senators.',
  126: 'You need to name three. You could say: Independence Day, Thanksgiving, and Memorial Day. Other good answers include New Year\'s Day, Martin Luther King Junior Day, Presidents Day, Labor Day, Columbus Day, Veterans Day, or Christmas.',
  // … all remaining ids 1–128, same style …
};
```

- [ ] **Step 1: Write the validation tests**

Create `tests/spoken-answers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SPOKEN_ANSWERS } from '../src/data/spoken-answers';
import { FLASHCARDS } from '../src/data/flashcards';

describe('SPOKEN_ANSWERS', () => {
  const cardIds = new Set(FLASHCARDS.map(c => c.id));

  it('covers all 128 cards', () => {
    expect(Object.keys(SPOKEN_ANSWERS)).toHaveLength(128);
  });

  it('has no entries for nonexistent card ids', () => {
    for (const id of Object.keys(SPOKEN_ANSWERS).map(Number)) {
      expect(cardIds.has(id), `id ${id} is not a card`).toBe(true);
    }
  });

  it('entries are clean spoken prose', () => {
    for (const [id, text] of Object.entries(SPOKEN_ANSWERS)) {
      expect(text.trim().length, `card ${id} empty`).toBeGreaterThan(0);
      expect(text, `card ${id} has brackets`).not.toMatch(/[[\]]/);
      expect(text, `card ${id} has parentheses`).not.toMatch(/[()]/);
      expect(text, `card ${id} has semicolons`).not.toMatch(/;/);
      expect(text, `card ${id} missing terminal punctuation`).toMatch(/[.!?]$/);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/spoken-answers.test.ts`
Expected: FAIL — cannot resolve `../src/data/spoken-answers`.

- [ ] **Step 3: Author `src/data/spoken-answers.ts`**

Write the file header and all 128 entries. Read each card's `q` and `a` in `src/data/flashcards.ts` and apply the authoring rules above. File header:

```ts
/**
 * Hand-authored spoken answer scripts for audio narration.
 * These are what the TTS reads for the ANSWER clip of each card — questions
 * are always read verbatim from flashcards.ts. Editing an entry here and
 * re-running `npm run generate:audio` regenerates exactly that clip.
 */
```

This is a content-authoring step — expect it to take longer than a code step. Work category by category following the `// ===== X: … =====` section comments in `src/data/flashcards.ts` (do not assume the id ranges — read them), and keep the register consistent: calm, direct, interview-useful.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/spoken-answers.test.ts`
Expected: PASS. Also run `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/spoken-answers.ts tests/spoken-answers.test.ts
git commit -m "feat: hand-authored spoken answer scripts for all 128 cards"
```

---

### Task 4: Generation script + stub manifest

**Files:**
- Create: `scripts/generate-audio.ts`
- Create: `public/audio/manifest.json` (stub `{}` — committed so the app-side import in Task 5 always resolves)

**Interfaces:**
- Consumes: `FLASHCARDS`, `SPOKEN_ANSWERS`, `speakText`, `clipHash`.
- Produces: `public/audio/q-<id>.mp3`, `a-<id>.mp3`, and `public/audio/manifest.json` matching the `AudioManifest` type (`{ "<kind>-<id>": { hash, duration } }`).

- [ ] **Step 1: Create the stub manifest**

Create `public/audio/manifest.json` containing exactly:

```json
{}
```

- [ ] **Step 2: Write the script**

Create `scripts/generate-audio.ts`:

```ts
/**
 * generate-audio — pre-generate card narration from a local Kokoro TTS server.
 *
 * Usage:
 *   npm run generate:audio                 # regenerate missing/changed clips
 *   npm run generate:audio -- --dry-run    # print planned work, no network
 *   npm run generate:audio -- --sample 126 # generate one card (voice audition)
 *   npm run generate:audio -- --force      # regenerate everything
 *
 * Env: TTS_URL (default http://localhost:8880), TTS_VOICE (default af_heart)
 *
 * Never runs in CI or `npm run build` — the committed MP3s are the artifact.
 */
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { parseBuffer } from 'music-metadata';
import { FLASHCARDS } from '../src/data/flashcards';
import { SPOKEN_ANSWERS } from '../src/data/spoken-answers';
import { speakText, clipHash } from './lib/spoken-text';
import type { AudioManifest } from '../src/types';

const TTS_URL = process.env.TTS_URL ?? 'http://localhost:8880';
const VOICE = process.env.TTS_VOICE ?? 'af_heart';
const AUDIO_DIR = new URL('../public/audio/', import.meta.url);
const MANIFEST_PATH = new URL('manifest.json', AUDIO_DIR);

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const sampleIdx = args.indexOf('--sample');
const SAMPLE_ID = sampleIdx >= 0 ? Number(args[sampleIdx + 1]) : null;

interface Job { key: string; file: string; text: string; }

function buildJobs(): Job[] {
  const cards = SAMPLE_ID !== null ? FLASHCARDS.filter(c => c.id === SAMPLE_ID) : FLASHCARDS;
  if (SAMPLE_ID !== null && cards.length === 0) {
    console.error(`No card with id ${SAMPLE_ID}`);
    process.exit(1);
  }
  return cards.flatMap(card => [
    { key: `q-${card.id}`, file: `q-${card.id}.mp3`, text: card.q },
    { key: `a-${card.id}`, file: `a-${card.id}.mp3`, text: SPOKEN_ANSWERS[card.id] ?? speakText(card.a) },
  ]);
}

async function loadManifest(): Promise<AudioManifest> {
  try { return JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as AudioManifest; }
  catch { return {}; }
}

async function saveManifest(m: AudioManifest): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

async function synthesize(text: string): Promise<Buffer> {
  const res = await fetch(`${TTS_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'kokoro', voice: VOICE, input: text, response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main(): Promise<void> {
  await mkdir(AUDIO_DIR, { recursive: true });
  const manifest = await loadManifest();
  const jobs = buildJobs();
  const wantedKeys = new Set(jobs.map(j => j.key));

  const existingFiles = new Set(
    (await readdir(AUDIO_DIR)).filter(f => f.endsWith('.mp3'))
  );

  const pending = jobs.filter(j => {
    const hash = clipHash(j.text, VOICE);
    return FORCE || manifest[j.key]?.hash !== hash || !existingFiles.has(j.file);
  });

  console.log(`${jobs.length} clips total; ${pending.length} to generate (voice: ${VOICE})`);
  if (DRY_RUN) {
    for (const j of pending) console.log(`  would generate ${j.file}: "${j.text.slice(0, 60)}…"`);
    return;
  }

  let failed = 0;
  for (const [i, job] of pending.entries()) {
    try {
      const mp3 = await synthesize(job.text);
      const meta = await parseBuffer(mp3, 'audio/mpeg');
      const duration = Math.round((meta.format.duration ?? 0) * 100) / 100;
      if (!duration) throw new Error('could not read duration');
      await writeFile(new URL(job.file, AUDIO_DIR), mp3);
      manifest[job.key] = { hash: clipHash(job.text, VOICE), duration };
      await saveManifest(manifest); // incremental: interrupted runs resume
      console.log(`  [${i + 1}/${pending.length}] ${job.file} (${duration}s)`);
    } catch (e) {
      failed++;
      console.error(`  FAILED ${job.file}: ${(e as Error).message}`);
    }
  }

  // Orphan cleanup only on full runs (a --sample run must not delete the deck)
  if (SAMPLE_ID === null) {
    for (const key of Object.keys(manifest)) {
      if (!wantedKeys.has(key)) {
        delete manifest[key];
        await unlink(new URL(`${key}.mp3`, AUDIO_DIR)).catch(() => {});
        console.log(`  removed orphan ${key}.mp3`);
      }
    }
    await saveManifest(manifest);
  }

  console.log(`Done. ${pending.length - failed} generated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Verify without the TTS server (dry run)**

Run: `npm run generate:audio -- --dry-run`
Expected: prints `256 clips total; 256 to generate (voice: af_heart)` followed by the list. Run it twice — output identical (pure hash computation, no writes).

- [ ] **Step 4: Verify the failure path**

Run: `npm run generate:audio -- --sample 126` **without** the TTS server reachable.
Expected: `FAILED q-126.mp3: …` and `FAILED a-126.mp3: …`, exit code 1, and `public/audio/manifest.json` still `{}` (no partial garbage).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-audio.ts public/audio/manifest.json
git commit -m "feat: TTS audio generation script with hash-manifest sync"
```

---

### Task 5: App-side manifest accessor (TDD)

**Files:**
- Create: `src/data/audio-manifest.ts`
- Test: `tests/audio-manifest.test.ts`

**Interfaces:**
- Consumes: `public/audio/manifest.json`, types from Task 1.
- Produces (used by Tasks 6–10): `getManifest(): AudioManifest`, `clipUrl(kind: ClipKind, id: number): string`, `clipDuration(kind: ClipKind, id: number): number` (0 if missing), `hasClip(kind: ClipKind, id: number): boolean`, `hasAudio(id: number): boolean` (both clips present).

- [ ] **Step 1: Write the failing tests**

Create `tests/audio-manifest.test.ts` (vitest provides `import.meta.env.BASE_URL === '/'`):

```ts
import { describe, it, expect } from 'vitest';
import { clipUrl, clipDuration, hasClip, hasAudio, getManifest } from '../src/data/audio-manifest';

describe('audio-manifest accessor', () => {
  it('builds base-aware clip URLs', () => {
    expect(clipUrl('q', 17)).toBe('/audio/q-17.mp3');
    expect(clipUrl('a', 17)).toBe('/audio/a-17.mp3');
  });

  it('reports duration 0 and hasClip false for entries missing from the manifest', () => {
    // Runs against the committed manifest; before generation it is the {} stub,
    // after generation these still hold for a nonexistent id.
    expect(clipDuration('q', 999)).toBe(0);
    expect(hasClip('q', 999)).toBe(false);
    expect(hasAudio(999)).toBe(false);
  });

  it('getManifest returns the parsed manifest object', () => {
    expect(typeof getManifest()).toBe('object');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/audio-manifest.test.ts`
Expected: FAIL — cannot resolve `../src/data/audio-manifest`.

- [ ] **Step 3: Implement**

Create `src/data/audio-manifest.ts`:

```ts
/**
 * Build-time-bundled audio manifest. Vite inlines the JSON, so clip URLs
 * and durations are available offline and synchronously — only the MP3s
 * themselves are fetched at runtime.
 */
import manifestJson from '../../public/audio/manifest.json';
import type { AudioManifest, ClipKind } from '../types';

const manifest = manifestJson as AudioManifest;

export function getManifest(): AudioManifest {
  return manifest;
}

export function clipUrl(kind: ClipKind, id: number): string {
  return `${import.meta.env.BASE_URL}audio/${kind}-${id}.mp3`;
}

export function clipDuration(kind: ClipKind, id: number): number {
  return manifest[`${kind}-${id}`]?.duration ?? 0;
}

export function hasClip(kind: ClipKind, id: number): boolean {
  return `${kind}-${id}` in manifest;
}

export function hasAudio(id: number): boolean {
  return hasClip('q', id) && hasClip('a', id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/audio-manifest.test.ts` — expected: PASS.
Run: `npx tsc --noEmit` — expected: no errors (`resolveJsonModule` is already on).

- [ ] **Step 5: Commit**

```bash
git add src/data/audio-manifest.ts tests/audio-manifest.test.ts
git commit -m "feat: bundled audio manifest accessor"
```

---

### Task 6: Listen queue builder (TDD)

**Files:**
- Create: `src/state/listen-queue.ts`
- Test: `tests/listen-queue.test.ts`

**Interfaces:**
- Consumes: `AudioManifest`, `ListenQueue`, `ListenQueueItem` types.
- Produces (used by Task 7 and the player bar): `MISSING_CLIP_DWELL = 4` (wall-clock seconds a missing clip's phase dwells) and `buildQueue(cardIds: number[], manifest: AudioManifest, gapSeconds: number, rate: number): ListenQueue`. Pure function — manifest passed in, no imports from `audio-manifest.ts`.

- [ ] **Step 1: Write the failing tests**

Create `tests/listen-queue.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildQueue, MISSING_CLIP_DWELL } from '../src/state/listen-queue';
import type { AudioManifest } from '../src/types';

const manifest: AudioManifest = {
  'q-1': { hash: 'h', duration: 4 },
  'a-1': { hash: 'h', duration: 6 },
  'q-2': { hash: 'h', duration: 3 },
  'a-2': { hash: 'h', duration: 5 },
};

describe('buildQueue', () => {
  it('computes per-card totals: q + gap + a at 1×', () => {
    const q = buildQueue([1, 2], manifest, 5, 1);
    expect(q.items[0].total).toBe(4 + 5 + 6);
    expect(q.items[1].total).toBe(3 + 5 + 5);
    expect(q.totalDuration).toBe(15 + 13);
  });

  it('startOffset is cumulative', () => {
    const q = buildQueue([1, 2], manifest, 5, 1);
    expect(q.items[0].startOffset).toBe(0);
    expect(q.items[1].startOffset).toBe(15);
  });

  it('scales clip time by rate but keeps the gap wall-clock', () => {
    const q = buildQueue([1], manifest, 5, 2);
    expect(q.items[0].total).toBe(4 / 2 + 5 + 6 / 2); // 10
    expect(q.rate).toBe(2);
  });

  it('uses MISSING_CLIP_DWELL for cards without clips, unscaled by rate', () => {
    const q = buildQueue([3], manifest, 5, 2);
    expect(q.items[0].qDuration).toBe(0);
    expect(q.items[0].aDuration).toBe(0);
    expect(q.items[0].total).toBe(MISSING_CLIP_DWELL + 5 + MISSING_CLIP_DWELL);
  });

  it('handles an empty id list', () => {
    const q = buildQueue([], manifest, 5, 1);
    expect(q.items).toHaveLength(0);
    expect(q.totalDuration).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/listen-queue.test.ts`
Expected: FAIL — cannot resolve `../src/state/listen-queue`.

- [ ] **Step 3: Implement**

Create `src/state/listen-queue.ts`:

```ts
/**
 * Pure queue math for listen mode. No DOM, no manifest import —
 * the manifest is passed in so this stays unit-testable.
 */
import type { AudioManifest, ListenQueue, ListenQueueItem } from '../types';

/** Wall-clock seconds a phase dwells when its clip is missing. */
export const MISSING_CLIP_DWELL = 4;

export function buildQueue(
  cardIds: number[],
  manifest: AudioManifest,
  gapSeconds: number,
  rate: number,
): ListenQueue {
  const items: ListenQueueItem[] = [];
  let offset = 0;
  for (const cardId of cardIds) {
    const q = manifest[`q-${cardId}`];
    const a = manifest[`a-${cardId}`];
    const qPlay = q ? q.duration / rate : MISSING_CLIP_DWELL;
    const aPlay = a ? a.duration / rate : MISSING_CLIP_DWELL;
    const total = qPlay + gapSeconds + aPlay;
    items.push({
      cardId,
      qDuration: q?.duration ?? 0,
      aDuration: a?.duration ?? 0,
      gap: gapSeconds,
      total,
      startOffset: offset,
    });
    offset += total;
  }
  return { items, totalDuration: offset, gapSeconds, rate };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run` — expected: ALL suites pass (spoken-text, spoken-answers, audio-manifest, listen-queue).

- [ ] **Step 5: Commit**

```bash
git add src/state/listen-queue.ts tests/listen-queue.test.ts
git commit -m "feat: listen queue builder with rate/gap duration math"
```

---

### Task 7: AudioPlayer engine

**Files:**
- Create: `src/state/audio-player.ts`

**Interfaces:**
- Consumes: `Store` (settings read/update only), `buildQueue`/`MISSING_CLIP_DWELL`, `getManifest`/`clipUrl`/`hasClip`, `showToast`, audio types.
- Produces (used by Tasks 8–10):
  - Streams: `AudioPlayer.status$: BehaviorSubject<PlayerStatus>`, `AudioPlayer.queue$: BehaviorSubject<ListenQueue | null>`, `AudioPlayer.position$: BehaviorSubject<PlayerPosition>`
  - Methods: `load(cardIds: number[]): void`, `play(): void`, `pause(): void`, `toggle(): void`, `next(): void`, `prev(): void`, `replayCard(): void`, `seekToCard(i: number): void` (seeking always starts playback — it is a user gesture), `setRate(r: number): void`, `setGap(s: number): void`, `stop(): void`, `playClip(kind: ClipKind, id: number): void` (one-shot; no-op while the loop is playing).
- MUST NOT import or call `setCardRating`, `createSession`, or `saveSession` (passive-listening constraint).

This is DOM-audio glue — no unit tests (per spec); the gate is `tsc` plus the manual checklist in Task 12.

- [ ] **Step 1: Implement**

Create `src/state/audio-player.ts`:

```ts
/**
 * AudioPlayer — singleton narration engine over one shared <audio> element.
 * Phase machine per card: question → gap (silent recall) → answer → advance.
 * Purely passive: reads settings, never writes ratings/mastery/sessions.
 */
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { interval } from 'rxjs/internal/observable/interval';
import type { Subscription } from 'rxjs/internal/Subscription';

import { Store } from './store';
import { buildQueue, MISSING_CLIP_DWELL } from './listen-queue';
import { getManifest, clipUrl, hasClip } from '../data/audio-manifest';
import { showToast } from '../components/shared/civic-toast';
import type { ClipKind, ListenPhase, ListenQueue, PlayerPosition, PlayerStatus } from '../types';

const status$ = new BehaviorSubject<PlayerStatus>('idle');
const queue$ = new BehaviorSubject<ListenQueue | null>(null);
const position$ = new BehaviorSubject<PlayerPosition>({
  cardIndex: 0, phase: 'question', cardElapsed: 0, totalElapsed: 0, phaseRemaining: 0,
});

let audio: HTMLAudioElement | null = null;
let cardIds: number[] = [];
let index = 0;
let phase: ListenPhase = 'question';
let silence = false;           // current phase is timer-driven (gap or missing clip)
let silenceMs = 0;             // full length of the current silent phase
let gapDeadline = 0;           // epoch ms when the silent phase ends
let gapRemaining = 0;          // ms left when paused mid-silence
let gapTimer: ReturnType<typeof setTimeout> | null = null;
let tickerSub: Subscription | null = null;
let oneShot = false;           // playClip() in flight — ended must not advance
let errorToastShown = false;

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
  }
  return audio;
}

const rate = () => Store.getSettings().playbackRate;
const gapSeconds = () => Store.getSettings().recallGapSeconds;

function rebuildQueue(): void {
  queue$.next(cardIds.length ? buildQueue(cardIds, getManifest(), gapSeconds(), rate()) : null);
}

function clearGapTimer(): void {
  if (gapTimer !== null) { clearTimeout(gapTimer); gapTimer = null; }
}

function startTicker(): void {
  if (tickerSub) return;
  tickerSub = interval(250).subscribe(() => position$.next(currentPosition()));
}

function stopTicker(): void {
  tickerSub?.unsubscribe();
  tickerSub = null;
}

function pushPosition(): void {
  position$.next(currentPosition());
}

function silenceElapsedSec(): number {
  if (!silence) return 0;
  const remaining = gapTimer !== null ? Math.max(0, gapDeadline - Date.now()) : gapRemaining;
  return (silenceMs - remaining) / 1000;
}

function currentPosition(): PlayerPosition {
  const q = queue$.getValue();
  const item = q?.items[index];
  let cardElapsed = 0;
  let phaseRemaining = 0;
  if (q && item) {
    const qPlay = item.qDuration ? item.qDuration / q.rate : MISSING_CLIP_DWELL;
    const aPlay = item.aDuration ? item.aDuration / q.rate : MISSING_CLIP_DWELL;
    const clipElapsed = silence ? silenceElapsedSec() : (audio?.currentTime ?? 0) / q.rate;
    if (phase === 'question') { cardElapsed = clipElapsed; phaseRemaining = qPlay - clipElapsed; }
    else if (phase === 'gap') { cardElapsed = qPlay + silenceElapsedSec(); phaseRemaining = item.gap - silenceElapsedSec(); }
    else { cardElapsed = qPlay + item.gap + clipElapsed; phaseRemaining = aPlay - clipElapsed; }
  }
  return {
    cardIndex: index, phase, cardElapsed,
    totalElapsed: (item?.startOffset ?? 0) + cardElapsed,
    phaseRemaining: Math.max(0, phaseRemaining),
  };
}

function startSilence(ms: number): void {
  clearGapTimer();
  silence = true;
  gapDeadline = Date.now() + ms;
  gapTimer = setTimeout(() => { gapTimer = null; advance(); }, ms);
}

function startPhase(p: ListenPhase): void {
  phase = p;
  status$.next('playing');
  startTicker();
  if (p === 'gap') {
    silenceMs = gapSeconds() * 1000;
    startSilence(silenceMs);
    pushPosition();
    return;
  }
  const kind: ClipKind = p === 'question' ? 'q' : 'a';
  const id = cardIds[index];
  if (!hasClip(kind, id)) {
    silenceMs = MISSING_CLIP_DWELL * 1000;
    startSilence(silenceMs);
    pushPosition();
    return;
  }
  silence = false;
  clearGapTimer();
  const el = ensureAudio();
  oneShot = false;
  el.src = clipUrl(kind, id);
  el.playbackRate = rate();
  void el.play().catch(onError);
  pushPosition();
}

function advance(): void {
  if (phase === 'question') { startPhase('gap'); return; }
  if (phase === 'gap') { startPhase('answer'); return; }
  if (index < cardIds.length - 1) { index++; startPhase('question'); return; }
  finish();
}

function finish(): void {
  stopTicker();
  clearGapTimer();
  silence = false;
  status$.next('complete');
  pushPosition();
}

function onEnded(): void {
  if (oneShot) { oneShot = false; return; }
  if (status$.getValue() !== 'playing') return;
  advance();
}

function onError(): void {
  if (oneShot) { oneShot = false; return; }
  if (status$.getValue() !== 'playing') return;
  if (!errorToastShown) {
    errorToastShown = true;
    showToast("Some audio isn't available offline", 'info');
  }
  advance(); // skip forward — the loop never stalls
}

// ── Public API ──

function load(ids: number[]): void {
  stop();
  cardIds = [...ids];
  index = 0;
  phase = 'question';
  errorToastShown = false;
  rebuildQueue();
  pushPosition();
}

function play(): void {
  if (!cardIds.length) return;
  const s = status$.getValue();
  if (s === 'paused') { resume(); return; }
  if (s === 'playing') return;
  index = Math.min(index, cardIds.length - 1);
  startPhase('question');
}

function pause(): void {
  if (status$.getValue() !== 'playing') return;
  if (silence) {
    gapRemaining = Math.max(0, gapDeadline - Date.now());
    clearGapTimer();
  } else {
    audio?.pause();
  }
  stopTicker();
  status$.next('paused');
  pushPosition();
}

function resume(): void {
  status$.next('playing');
  startTicker();
  if (silence) startSilence(gapRemaining); // silenceMs untouched → elapsed stays correct
  else void audio?.play().catch(onError);
}

function toggle(): void {
  const s = status$.getValue();
  if (s === 'playing') pause();
  else if (s === 'paused') resume();
  else play();
}

function seekToCard(i: number): void {
  if (!cardIds.length) return;
  index = Math.max(0, Math.min(i, cardIds.length - 1));
  startPhase('question'); // seeking is a user gesture — always plays
}

function next(): void { seekToCard(index + 1); }
function prev(): void { seekToCard(index - 1); }
function replayCard(): void { seekToCard(index); }

function setRate(r: number): void {
  Store.updateSettings({ playbackRate: r });
  if (audio && !silence) audio.playbackRate = r;
  rebuildQueue();
}

function setGap(s: number): void {
  Store.updateSettings({ recallGapSeconds: s });
  rebuildQueue(); // an in-flight gap keeps its old length; next gap uses the new one
}

function stop(): void {
  clearGapTimer();
  stopTicker();
  if (audio) { audio.pause(); audio.removeAttribute('src'); }
  silence = false;
  oneShot = false;
  index = 0;
  phase = 'question';
  cardIds = [];
  queue$.next(null);
  status$.next('idle');
}

function playClip(kind: ClipKind, id: number): void {
  if (!hasClip(kind, id)) return;
  if (status$.getValue() === 'playing') return; // the loop owns the element
  const el = ensureAudio();
  oneShot = true;
  el.src = clipUrl(kind, id);
  el.playbackRate = rate();
  void el.play().catch(() => { oneShot = false; });
}

export const AudioPlayer = {
  status$, queue$, position$,
  load, play, pause, toggle, next, prev, replayCard, seekToCard,
  setRate, setGap, stop, playClip,
};
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx vitest run` — expected: all existing suites still pass.
Grep the passive-listening constraint: `grep -n "setCardRating\|saveSession\|createSession" src/state/audio-player.ts` — expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add src/state/audio-player.ts
git commit -m "feat: AudioPlayer narration engine (phase machine over one audio element)"
```

---

### Task 8: Speaker button on flash-card + practice-mode wiring

**Files:**
- Modify: `src/components/shared/flash-card.ts`
- Modify: `src/components/views/civic-study.ts` (renderCard + attachEvents)
- Modify: `src/styles/index.css`

**Interfaces:**
- Consumes: `AudioPlayer.playClip`, `hasAudio`.
- Produces: `FlashCard.audio: boolean` property (shows speaker buttons when true), `FlashCard.hint: string` setter (replaces the front-face hint text — Task 10 uses it for the gap countdown), and a bubbling `speak` CustomEvent with `detail: { kind: ClipKind }`.

- [ ] **Step 1: Extend `flash-card.ts`**

Add the property/setters after the existing `flipped` setter:

```ts
  private _audio = false;

  /** Show read-aloud speaker buttons (practice mode only). */
  set audio(val: boolean) {
    this._audio = val;
    this.render();
  }

  /** Replace the front-face hint line (listen mode's gap countdown). */
  set hint(text: string) {
    const el = this.querySelector('.flashcard-face.front .flashcard-hint');
    if (el) el.textContent = text;
  }
```

In `handleClick`, route speaker clicks before dispatching `flip`:

```ts
  private handleClick = (e: MouseEvent) => {
    const speak = (e.target as HTMLElement).closest('.flashcard-speak');
    if (speak) {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('speak', {
        bubbles: true,
        detail: { kind: (speak as HTMLElement).dataset.kind as 'q' | 'a' },
      }));
      return;
    }
    this.dispatchEvent(new CustomEvent('flip', { bubbles: true }));
  };
```

In `render()`, add a speaker button to each face (inside the existing face divs, right after `${frame}`), only when `_audio`:

```ts
    const speakBtn = (kind: 'q' | 'a', label: string) => this._audio
      ? `<button class="flashcard-speak" data-kind="${kind}" aria-label="${label}">
           <span class="material-icons-round">volume_up</span>
         </button>`
      : '';
```

Front face gets `${speakBtn('q', 'Read question aloud')}`, back face gets `${speakBtn('a', 'Read answer aloud')}`.

- [ ] **Step 2: Wire it in `civic-study.ts`**

In `renderCard()`, after `fc.flipped = false;`:

```ts
    fc.audio = hasAudio(card.id);
```

In `attachEvents()`:

```ts
    this.addEventListener('speak', ((e: CustomEvent) => {
      const card = this.cards[this.currentIndex];
      if (card) AudioPlayer.playClip(e.detail.kind, card.id);
    }) as EventListener);
```

New imports at the top of `civic-study.ts`:

```ts
import { AudioPlayer } from '../../state/audio-player';
import { hasAudio } from '../../data/audio-manifest';
```

- [ ] **Step 3: Add CSS** (in `src/styles/index.css`, after the `.flashcard-hint kbd` rules)

```css
/* ── Read-aloud speaker button (practice mode) ── */
.flashcard-speak {
  position: absolute;
  top: 14px;
  right: 46px; /* clear of the corner flourish */
  z-index: 1;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--hairline);
  border-radius: 50%;
  background: transparent;
  color: var(--gold-text);
  cursor: pointer;
}
.flashcard-speak:hover { box-shadow: var(--shadow-soft); color: var(--ink); }
.flashcard-speak .material-icons-round { font-size: 18px; }
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm run dev`, open a study session. With the stub manifest (no audio generated yet), NO speaker button should appear (`hasAudio` is false) and nothing regresses: flip, rate, navigate all work. If sample audio for one card exists locally (Task 12 generates the real set), that card shows the button and clicking it plays without flipping the card.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/flash-card.ts src/components/views/civic-study.ts src/styles/index.css
git commit -m "feat: read-aloud speaker button on flashcards in practice mode"
```

---

### Task 9: `<listen-player-bar>` component

**Files:**
- Create: `src/components/shared/listen-player-bar.ts`
- Modify: `src/styles/index.css`

**Interfaces:**
- Consumes: `AudioPlayer` streams + methods (Task 7), `ListenQueue` type.
- Produces: `<listen-player-bar>` custom element, fully self-driving (subscribes to AudioPlayer; controls call AudioPlayer directly). Task 10 only appends/removes it.

- [ ] **Step 1: Implement the component**

Create `src/components/shared/listen-player-bar.ts`:

```ts
/**
 * <listen-player-bar> — transport + segmented per-card timeline for listen mode.
 * Self-driving: subscribes to AudioPlayer streams; controls call AudioPlayer.
 */
import { Subject } from 'rxjs/internal/Subject';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';

import { AudioPlayer } from '../../state/audio-player';
import { Store } from '../../state/store';
import type { ListenQueue } from '../../types';

const RATES = [0.75, 1, 1.25, 1.5];
const GAPS = [3, 5, 8];

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class ListenPlayerBar extends HTMLElement {
  private destroy$ = new Subject<void>();
  private queue: ListenQueue | null = null;

  connectedCallback() {
    const { playbackRate, recallGapSeconds } = Store.getSettings();
    this.innerHTML = `
      <div class="lpb">
        <div class="lpb-track" id="lpb-track" role="slider" aria-label="Listening progress"></div>
        <div class="lpb-controls">
          <span class="lpb-time" id="lpb-elapsed">0:00</span>
          <div class="lpb-buttons">
            <button class="lpb-btn" id="lpb-replay" aria-label="Replay card"><span class="material-icons-round">replay</span></button>
            <button class="lpb-btn" id="lpb-prev" aria-label="Previous card"><span class="material-icons-round">skip_previous</span></button>
            <button class="lpb-btn lpb-btn-play" id="lpb-play" aria-label="Play or pause"><span class="material-icons-round">play_arrow</span></button>
            <button class="lpb-btn" id="lpb-next" aria-label="Next card"><span class="material-icons-round">skip_next</span></button>
            <button class="lpb-btn lpb-btn-text" id="lpb-rate" aria-label="Playback speed">${playbackRate}×</button>
            <label class="lpb-gap">Gap
              <select id="lpb-gap-select" aria-label="Recall gap seconds">
                ${GAPS.map(g => `<option value="${g}" ${g === recallGapSeconds ? 'selected' : ''}>${g}s</option>`).join('')}
              </select>
            </label>
          </div>
          <span class="lpb-time" id="lpb-total">0:00</span>
        </div>
      </div>
    `;

    this.querySelector('#lpb-play')?.addEventListener('click', () => AudioPlayer.toggle());
    this.querySelector('#lpb-prev')?.addEventListener('click', () => AudioPlayer.prev());
    this.querySelector('#lpb-next')?.addEventListener('click', () => AudioPlayer.next());
    this.querySelector('#lpb-replay')?.addEventListener('click', () => AudioPlayer.replayCard());
    this.querySelector('#lpb-rate')?.addEventListener('click', () => {
      const cur = Store.getSettings().playbackRate;
      const nextRate = RATES[(RATES.indexOf(cur) + 1) % RATES.length];
      AudioPlayer.setRate(nextRate);
      const btn = this.querySelector('#lpb-rate');
      if (btn) btn.textContent = `${nextRate}×`;
    });
    this.querySelector('#lpb-gap-select')?.addEventListener('change', (e) => {
      AudioPlayer.setGap(Number((e.target as HTMLSelectElement).value));
    });
    this.querySelector('#lpb-track')?.addEventListener('click', (e) => {
      const chunk = (e.target as HTMLElement).closest('.lpb-chunk') as HTMLElement | null;
      if (chunk) AudioPlayer.seekToCard(Number(chunk.dataset.index));
    });

    AudioPlayer.queue$.pipe(takeUntil(this.destroy$)).subscribe(q => {
      this.queue = q;
      this.renderTrack();
    });
    AudioPlayer.position$.pipe(takeUntil(this.destroy$)).subscribe(pos => {
      const el = this.querySelector('#lpb-elapsed');
      if (el) el.textContent = fmt(pos.totalElapsed);
      this.updateFill(pos.cardIndex, pos.cardElapsed);
    });
    AudioPlayer.status$.pipe(takeUntil(this.destroy$)).subscribe(s => {
      const icon = this.querySelector('#lpb-play .material-icons-round');
      if (icon) icon.textContent = s === 'playing' ? 'pause' : 'play_arrow';
    });
  }

  disconnectedCallback() {
    this.destroy$.next();
  }

  private renderTrack() {
    const track = this.querySelector('#lpb-track');
    const total = this.querySelector('#lpb-total');
    if (!track) return;
    if (!this.queue) { track.innerHTML = ''; return; }
    if (total) total.textContent = fmt(this.queue.totalDuration);
    track.innerHTML = this.queue.items.map((item, i) => `
      <div class="lpb-chunk" data-index="${i}"
           style="flex-grow:${item.total}"
           title="Card ${item.cardId}">
        <div class="lpb-chunk-fill"></div>
      </div>
    `).join('');
  }

  private updateFill(cardIndex: number, cardElapsed: number) {
    if (!this.queue) return;
    this.querySelectorAll<HTMLElement>('.lpb-chunk').forEach((chunk, i) => {
      const fill = chunk.querySelector('.lpb-chunk-fill') as HTMLElement | null;
      if (!fill) return;
      const item = this.queue!.items[i];
      if (i < cardIndex) fill.style.width = '100%';
      else if (i > cardIndex) fill.style.width = '0%';
      else fill.style.width = `${Math.min(100, (cardElapsed / item.total) * 100)}%`;
      chunk.classList.toggle('current', i === cardIndex);
    });
  }
}

customElements.define('listen-player-bar', ListenPlayerBar);
```

- [ ] **Step 2: Add CSS** (in `src/styles/index.css`, new section after the study-view rules)

```css
/* ── Listen mode player bar ── */
.lpb {
  width: 100%;
  max-width: 620px;
  margin-top: var(--sp-6);
  padding: var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 6px;
  box-shadow: var(--shadow-soft);
}
.lpb-track {
  display: flex;
  gap: 2px;
  height: 10px;
  margin-bottom: var(--sp-4);
  cursor: pointer;
}
.lpb-chunk {
  position: relative;
  flex-basis: 0;
  min-width: 2px;
  background: color-mix(in srgb, var(--hairline) 60%, transparent);
  border-radius: 2px;
  overflow: hidden;
}
.lpb-chunk.current { outline: 1px solid var(--gold); outline-offset: 1px; }
.lpb-chunk-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  background: var(--gold);
}
.lpb-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}
.lpb-buttons { display: flex; align-items: center; gap: var(--sp-2); }
.lpb-time {
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  color: var(--ink-soft);
  min-width: 42px;
}
.lpb-btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid var(--hairline);
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}
.lpb-btn:hover { box-shadow: var(--shadow-soft); }
.lpb-btn-play {
  width: 48px;
  height: 48px;
  background: var(--navy);
  border-color: var(--navy);
  color: #fff;
}
.lpb-btn-text {
  width: auto;
  padding: 0 var(--sp-3);
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.lpb-gap {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}
.lpb-gap select {
  font-family: var(--font-body);
  font-size: 0.8rem;
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
}
@media (max-width: 640px) {
  .lpb-controls { flex-wrap: wrap; justify-content: center; }
}
```

Note: if `--ink-soft` does not exist in `index.css` `:root`, use the muted text token that does (check `grep -n "ink-soft\|gray-500" src/styles/index.css` and match the existing convention).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expected: no errors. (Visual verification lands with Task 10, which mounts the bar.)

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/listen-player-bar.ts src/styles/index.css
git commit -m "feat: listen-player-bar with segmented per-card timeline"
```

---

### Task 10: Listen mode in civic-study

**Files:**
- Modify: `src/components/views/civic-study.ts`
- Modify: `src/styles/index.css`

**Interfaces:**
- Consumes: `AudioPlayer` (Task 7), `<listen-player-bar>` (Task 9), `FlashCard.hint` / `flipped` (Task 8).
- Produces: the complete two-mode study view. No new exports.

Behavior contract (from spec §3): toggling Listen hides rating UI, mounts the bar, plays from the current card, flips the card when the answer clip starts, counts down in the hint during the gap, auto-advances; toggling back stops audio instantly and restores practice on the same card; end-of-queue shows a quiet completion overlay; Esc and route-leave stop audio; no ratings are ever written from listen mode.

- [ ] **Step 1: Add state and imports to `civic-study.ts`**

New imports (top of file):

```ts
import '../shared/listen-player-bar';
```

(`AudioPlayer` and `hasAudio` imports were added in Task 8.)

New fields on the class:

```ts
  private mode: 'practice' | 'listen' = 'practice';
  private listenSub: Subscription | null = null;
```

`Subscription` is currently a type-only import at `civic-study.ts:7`; this task constructs one (`new Subscription()`), so change it to a value import:

```ts
import { Subscription } from 'rxjs/internal/Subscription';
```

- [ ] **Step 2: Add the mode toggle to the session bar**

In `render()`, replace the session-bar block with:

```html
          <div class="session-bar">
            <span class="eyebrow eyebrow-quiet">${this.session?.typeName ?? 'Study'}</span>
            <div class="session-track"><div class="session-track-fill" id="progress-fill" style="width:${pct}%"></div></div>
            <span class="session-count" id="progress-sub">${reviewed} / ${total}</span>
            <div class="mode-toggle" role="group" aria-label="Study mode">
              <button class="mode-toggle-btn active" data-mode="practice">Study</button>
              <button class="mode-toggle-btn" data-mode="listen">Listen</button>
            </div>
          </div>
```

And a mount point for the player bar: immediately after `<rating-bar id="rating-bar"></rating-bar>` add

```html
          <div id="player-bar-slot"></div>
```

- [ ] **Step 3: Implement mode switching**

Add methods to the class:

```ts
  private setMode(mode: 'practice' | 'listen') {
    if (mode === this.mode) return;
    this.mode = mode;
    this.querySelectorAll<HTMLElement>('.mode-toggle-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === mode));
    this.querySelector('#study-view')?.classList.toggle('listen-mode', mode === 'listen');
    if (mode === 'listen') this.enterListen();
    else this.exitListen();
  }

  private enterListen() {
    if (!this.session) return;
    const slot = this.querySelector('#player-bar-slot');
    if (slot && !slot.querySelector('listen-player-bar')) {
      slot.appendChild(document.createElement('listen-player-bar'));
    }
    AudioPlayer.load(this.session.cardIds);

    this.listenSub?.unsubscribe();
    this.listenSub = new Subscription();
    this.listenSub.add(AudioPlayer.position$.subscribe(pos => {
      if (this.mode !== 'listen') return;
      if (pos.cardIndex !== this.currentIndex) {
        this.currentIndex = pos.cardIndex;
        this.renderCard();
      }
      const fc = this.querySelector('flash-card') as InstanceType<typeof import('../shared/flash-card').FlashCard> | null;
      if (!fc) return;
      if (pos.phase === 'answer' && !this.isFlipped) {
        this.isFlipped = true;
        fc.flipped = true;
      } else if (pos.phase !== 'answer' && this.isFlipped) {
        this.isFlipped = false;
        fc.flipped = false;
      }
      if (pos.phase === 'gap') {
        fc.hint = `Answer in ${Math.ceil(pos.phaseRemaining)}…`;
      } else if (pos.phase === 'question') {
        fc.hint = 'Listen…';
      }
    }));
    this.listenSub.add(AudioPlayer.status$.subscribe(s => {
      if (this.mode === 'listen' && s === 'complete') this.showListenComplete();
    }));

    AudioPlayer.seekToCard(this.currentIndex); // the toggle tap is the user gesture
  }

  private exitListen() {
    this.listenSub?.unsubscribe();
    this.listenSub = null;
    AudioPlayer.stop();
    this.querySelector('#player-bar-slot')!.innerHTML = '';
    this.renderCard(); // restores hint text and unflipped state
  }

  private showListenComplete() {
    const queue = AudioPlayer.queue$.getValue();
    const count = this.cards.length;
    const minutes = queue ? Math.max(1, Math.round(queue.totalDuration / 60)) : 0;
    const completeEl = this.querySelector('#session-complete') as HTMLElement | null;
    if (!completeEl) return;
    completeEl.style.display = 'block';
    completeEl.innerHTML = `
      <div class="card-detail-overlay" id="listen-complete-overlay">
        <div class="card-detail" style="text-align: center;">
          <div class="card-detail-body" style="padding: 40px;">
            <div style="font-family: var(--font-display); font-weight: 600; font-size: 1.5rem; margin-bottom: 8px;">End of the deck</div>
            <p style="margin-bottom: 24px; color: var(--gray-500);">
              You listened through ${count} cards, about ${minutes} minute${minutes === 1 ? '' : 's'}.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-yellow" id="listen-replay">Replay</button>
              <button class="btn btn-white" id="listen-to-study">Switch to Study</button>
              <button class="btn btn-white" id="listen-dashboard">Back to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    `;
    completeEl.querySelector('#listen-replay')?.addEventListener('click', () => {
      completeEl.style.display = 'none';
      this.currentIndex = 0;
      this.renderCard();
      AudioPlayer.seekToCard(0);
    });
    completeEl.querySelector('#listen-to-study')?.addEventListener('click', () => {
      completeEl.style.display = 'none';
      this.setMode('practice');
    });
    completeEl.querySelector('#listen-dashboard')?.addEventListener('click', () => Router.navigate('#/dashboard'));
  }
```

Note `showListenComplete` reuses the existing overlay markup conventions from `completeSession()` (`card-detail-overlay`, `btn btn-yellow`, `--gray-500`) — check those class/token names against the file as it exists and match them exactly.

- [ ] **Step 4: Wire the toggle, guard practice interactions, extend keyboard**

In `attachEvents()` add:

```ts
    this.querySelectorAll<HTMLElement>('.mode-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode as 'practice' | 'listen'));
    });
```

Guard `flipCard()` (the loop owns the flip in listen mode) — first line:

```ts
    if (this.mode === 'listen') return;
```

Guard `rateCard()` — first line (defense in depth; rating UI is hidden anyway):

```ts
    if (this.mode === 'listen') return;
```

Make the arrow buttons mode-aware — replace the two existing listeners:

```ts
    this.querySelector('#card-prev')?.addEventListener('click', () =>
      this.mode === 'listen' ? AudioPlayer.prev() : this.goPrev());
    this.querySelector('#card-next')?.addEventListener('click', () =>
      this.mode === 'listen' ? AudioPlayer.next() : this.goNext());
```

In `handleKey()`, insert listen-mode handling before the existing switch:

```ts
    if (this.mode === 'listen') {
      switch (e.key) {
        case ' ': e.preventDefault(); AudioPlayer.toggle(); return;
        case 'ArrowLeft': e.preventDefault(); AudioPlayer.prev(); return;
        case 'ArrowRight': e.preventDefault(); AudioPlayer.next(); return;
        case 'r': case 'R': e.preventDefault(); AudioPlayer.replayCard(); return;
        case 'Escape': break; // fall through to the shared exit path below
        default: return; // ratings and flip are disabled by ear
      }
    }
```

In the existing `Escape` case and in `disconnectedCallback()`, add:

```ts
    AudioPlayer.stop();
```

In `renderCard()`, make the speaker flag mode-aware (updating the Task 8 line):

```ts
    fc.audio = this.mode === 'practice' && hasAudio(card.id);
```

Also in `connectedCallback()`, reset `this.mode = 'practice'` alongside the other state resets (a re-entered view must not start in listen mode).

- [ ] **Step 5: Add CSS** (in `src/styles/index.css`)

```css
/* ── Study/Listen mode toggle ── */
.mode-toggle {
  display: flex;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  overflow: hidden;
  flex-shrink: 0;
}
.mode-toggle-btn {
  padding: 4px 14px;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
  cursor: pointer;
}
.mode-toggle-btn.active {
  background: var(--navy);
  color: #fff;
}

/* Listen mode hides rating interactions; arrows stay as player prev/next */
.listen-mode .btn-still-learning,
.listen-mode .btn-i-know-this,
.listen-mode rating-bar { display: none; }
```

(Same `--ink-soft` caveat as Task 9 — match the muted-text token the stylesheet actually defines.)

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm run dev` and (with the stub manifest — no audio yet) verify the structure: toggle renders in the session bar; switching to Listen hides rating UI and mounts the player bar; the loop runs through cards on silent dwells (missing clips → `MISSING_CLIP_DWELL` per phase) with the countdown and flips firing; toggling back restores practice; Esc exits cleanly; no console errors. This silent-dwell run is exactly the missing-audio degradation path from spec §5, so verifying it now is not wasted work.

- [ ] **Step 7: Commit**

```bash
git add src/components/views/civic-study.ts src/styles/index.css
git commit -m "feat: hands-free listen mode with synced card flip and player bar"
```

---

### Task 11: PWA runtime caching for audio

**Files:**
- Modify: `vite.config.ts:21-38` (workbox block)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: offline replay of previously heard clips; no MP3 precache.

- [ ] **Step 1: Add the runtime caching rule**

In `vite.config.ts`, inside `workbox.runtimeCaching`, after the Google Fonts entry:

```ts
          {
            urlPattern: /\/audio\/.+\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'card-audio',
              rangeRequests: true, // iOS Safari fetches audio with Range requests
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
```

- [ ] **Step 2: Verify no MP3 precache**

Run: `npm run build`
Then: `grep -o 'audio/[^"]*\.mp3' dist/sw.js | head` — expected: matches only inside the runtime-caching route regex, NOT in the precache manifest array. Cross-check: `node -e "const m=require('fs').readFileSync('dist/sw.js','utf8'); console.log(/precache/i.test(m) && m.includes('.mp3') ? 'inspect manually' : 'ok')"` — if it prints `inspect manually`, open `dist/sw.js` and confirm the precache list has no `.mp3` entries; if any appear, add `globIgnores: ['**/audio/**']` to the `workbox` block and rebuild.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: CacheFirst runtime caching for card audio with range-request support"
```

---

### Task 12: Full generation run, docs, and manual verification

**Files:**
- Create: `public/audio/*.mp3` (256 files, generated)
- Modify: `public/audio/manifest.json` (generated content)
- Modify: `CLAUDE.md` (commands section)

**Interfaces:**
- Consumes: everything.
- Produces: the shippable feature.

**Requires the user's TTS server** (`ghcr.io/remsky/kokoro-fastapi-cpu` on `http://localhost:8880`, home network). If it is unreachable, complete Steps 1 and 5–6, and hand the generation steps to the user as the single remaining action.

- [ ] **Step 1: Document the command**

In `CLAUDE.md` under `## Commands`, add:

```markdown
- `npm run generate:audio` — Regenerate card narration MP3s from the local Kokoro TTS server (requires `http://localhost:8880`; only changed clips regenerate). Flags: `--dry-run`, `--sample <id>`, `--force`. Env: `TTS_URL`, `TTS_VOICE`.
```

- [ ] **Step 2: Audition the voice**

Run: `npm run generate:audio -- --sample 126`
Listen to `public/audio/q-126.mp3` and `a-126.mp3` (e.g. `open public/audio/a-126.mp3`). Confirm `af_heart` sounds right with the user; to compare, `TTS_VOICE=af_bella npm run generate:audio -- --sample 126` (note: changing voice changes hashes, so the final full run must use the chosen voice).

- [ ] **Step 3: Full run**

Run: `npm run generate:audio`
Expected: 256 clips generated sequentially (CPU TTS — expect several minutes), `Done. 256 generated, 0 failed.`
Then run it AGAIN: expected `256 clips total; 0 to generate` — proves hash-sync idempotency.
Check size: `du -sh public/audio` — expected single-digit MB.

- [ ] **Step 4: Sync-behavior spot check**

Edit one entry in `src/data/spoken-answers.ts` (add a word), run `npm run generate:audio` — expected: exactly 1 clip regenerates. Revert the edit, run again — expected: exactly 1 clip regenerates back. Working tree clean except audio.

- [ ] **Step 5: Manual verification checklist** (from spec §6; run `npm run dev`, real audio now present)

- Practice mode: speaker button on question face plays the question; after flip, plays the answer; card does not flip when the button is clicked.
- Toggle Listen mid-session: narration starts at the current card; question → countdown in hint → flip exactly as answer starts → auto-advance.
- Pause during the recall gap; resume — the gap continues from where it froze (does not restart).
- Tap a timeline chunk — playback jumps to that card's question.
- Speed 1.5×: clips faster, gap unchanged, total time in the bar shrinks accordingly.
- Toggle back to Study mid-card: audio stops instantly, rating bar returns, same card shown, rating works.
- Esc during listen: exits to dashboard, audio stops, partial manual ratings saved (existing behavior).
- Let the queue finish: quiet completion overlay with count/minutes; Replay and Switch to Study work.
- Keyboard in listen mode: Space, ←/→, R; digits do NOT rate.
- Offline (DevTools offline after playing a few cards from `npm run preview`): previously heard clips replay; unheard clips skip forward with a single toast.
- `npm run build` passes; `npm test` passes.

- [ ] **Step 6: Commit**

```bash
git add public/audio CLAUDE.md
git commit -m "feat: generated card narration audio (af_heart) and docs"
```

---

## Known limitation (documented, not worked around)

Chained clips pause under iOS screen lock. The stitched per-category/full-deck podcast tracks with Media Session API support are the planned fast follow (spec "Out of scope"); nothing in this plan blocks them — they consume the same clips and manifest.

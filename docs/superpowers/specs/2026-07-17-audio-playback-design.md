# Audio Playback — Design Spec

**Date:** 2026-07-17
**Status:** Approved
**Scope:** Pre-generated TTS audio for all 128 cards, plus two ways to hear it in the existing study view: a hands-free **Listen mode** (narrated loop) and a per-card **read-aloud button** in the scored practice mode. No new routes, no changes to mastery data or session scoring.

## Goal

Hear the deck by ear: cards narrated one after another, hands-free, following the app's own session ordering — plus on-demand narration of any single card while practicing. Audio is generated once at authoring time from a local TTS server and committed to the repo; the deployed app (GitHub Pages, static) only ever serves static MP3s.

## Decisions (settled during brainstorming)

| Question | Decision |
|---|---|
| Which playback flavor ships first | Chained per-clip playback. Stitched "podcast" tracks (ffmpeg concat, Media Session, lock-screen-proof on iOS) are a fast follow — the per-clip files are their input. |
| Where the UI lives | Inside the existing study view: a **Study \| Listen** mode toggle. No new route or sidebar entry. |
| Pacing | Question → silent recall gap (3/5/8 s, user setting) → answer → auto-advance. |
| Mastery interaction | Listening is purely passive: never writes ratings, mastery, or sessions. Practice mode remains the only scored path. |
| Controls | Play/pause, prev/next card, replay card, speed (0.75×–1.5×), segmented bottom timeline with tap-to-seek, elapsed/total time. |
| Spoken text | Hand-authored spoken answer scripts committed as data (one-time authoring job), mechanical transform as fallback. Questions read verbatim. |
| Format | MP3 mono, ~48–64 kbps (Kokoro outputs 24 kHz), ~few MB for 256 clips, committed to the repo. |
| Sync strategy | Content-hash manifest; only changed/missing clips regenerate. |
| Voice | `af_heart` (Kokoro's only A-graded voice, clear American English). Env-configurable; voice is part of the clip hash. |

## Architecture overview

```
scripts/generate-audio.mjs ──(local TTS, authoring time)──▶ public/audio/*.mp3 + manifest.json (committed)
                                                                    │
src/data/audio-manifest.ts  ◀── imports manifest at build time ─────┘
        │
src/state/audio-player.ts   ── RxJS state machine over one <audio> element
        │
civic-study.ts + flash-card.ts ── Listen toggle, player bar, speaker button
```

Playback engine choice: **single shared `HTMLAudioElement` driven by an RxJS state machine** (approach approved over Web Audio API buffers and dual ping-pong elements). Recall gaps are a feature, so gapless playback is a non-goal; one element is sufficient and keeps `playbackRate` and future Media Session wiring free.

## 1. Audio generation pipeline

**Script:** `scripts/generate-audio.mjs`, run manually via `npm run generate:audio`. Never part of `npm run build` — CI/GitHub Pages cannot reach the TTS box; the committed audio is the artifact.

**TTS call:** kokoro-fastapi (Docker, home network) exposes an OpenAI-compatible endpoint:
`POST http://localhost:8880/v1/audio/speech` with `{ model: "kokoro", voice, input, response_format: "mp3", speed }`. Requests run sequentially (CPU container). Env config: `TTS_URL` (default `http://localhost:8880`), `TTS_VOICE` (default `af_heart`).

**Flags:**
- `--sample <id>` — generate one card's clips, for auditioning voices cheaply.
- `--force` — regenerate everything regardless of hashes.

**Spoken text sources, in priority order:**

1. **`src/data/spoken-answers.ts`** — a map of card id → hand-crafted spoken answer script, authored once during implementation (by Claude, reviewed by the user), committed like any other data. Authoring rules:
   - State what the question demands ("You need to name three…"), give a natural best answer first, then alternates conversationally ("Other good answers include…").
   - Drop bracketed editorial notes entirely.
   - For "answers will vary" cards (23, 29, 30, 38, 39, and similar), say something honest and useful: e.g. "This depends on your state — check senate.gov for your current senators."
2. **`speakText(card)` fallback** — a mechanical transform inside the script for any card without an override, so a future card-text edit never breaks generation:
   - strip `[bracketed editorial notes]`;
   - strip parenthetical duplications/abbreviations, keeping the first spoken form ("Twenty-seven (27)" → "Twenty-seven"; "(U.S.) Congress" → "Congress");
   - convert `;` separators to sentence breaks so lists read calmly.

**Questions are read verbatim** — they are already natural speech, and hearing the exact official wording is a feature (it is what the officer will say).

**Output:** `public/audio/q-<id>.mp3` and `public/audio/a-<id>.mp3` (immutable card ids; 256 clips), plus `public/audio/manifest.json`:

```json
{ "q-17": { "hash": "<sha256 of final spoken text + voice>", "duration": 4.72 }, ... }
```

- Hash is computed over the **final spoken string** (override or fallback) plus the voice name — editing a spoken script or changing `TTS_VOICE` regenerates exactly the affected clips.
- **Durations are measured at generation time** (parse the fetched MP3), so the player renders the segmented timeline and total time instantly without probing files at runtime.
- On each run: recompute hashes from current card text; regenerate only missing/changed clips; delete orphaned clips for removed ids.
- The manifest is updated **incrementally after each successful clip**, so an interrupted run resumes on re-run. Per-clip failures are logged, summarized at exit, and produce a non-zero exit code.

**App-side access:** `src/data/audio-manifest.ts` imports the manifest JSON (Vite bundles JSON natively — no runtime fetch) and exposes `clipUrl(kind, id)`, `clipDuration(kind, id)`, and `hasAudio(id)`. Missing clips are known at render time; no 404 surprises mid-playback.

## 2. Playback engine — `src/state/audio-player.ts`

A singleton service in `src/state/`, same shape as `store.ts`: RxJS `BehaviorSubject`s + an imperative API. All RxJS imports from `rxjs/internal/*`. No DOM component owns playback state.

**Machinery:** one shared `HTMLAudioElement` created by the service; clip changes swap `src`. A `ListenQueue` is an ordered list of card ids with per-card clip URLs/durations and the recall gap. Per-card phase machine:

```
idle → playing-question → recall-gap (silent, RxJS timer) → playing-answer → advance → … → complete
```

- Transitions driven by `ended` events (`fromEvent`) and `timer` for the gap.
- Pause works in any phase; pausing during the gap freezes the remaining gap time and resumes mid-gap.
- Speed sets `audio.playbackRate` (persisted setting). Gap length (3/5/8 s) is a persisted setting. Timeline math uses `clipDuration / rate` for clips; the gap stays wall-clock.

**Public streams:**
- `status$` — `'idle' | 'playing' | 'paused' | 'complete'`
- `position$` — `{ cardIndex, phase, cardElapsed, totalElapsed }`, ticking ~4×/s while playing (an `interval` gated by status, reading `audio.currentTime` — no hand-rolled clock drift)
- `queue$` — the loaded queue with per-card total durations (`q + gap + a`), so the segmented bar knows every chunk width and the grand total up front

**Public API:** `load(queue)`, `play()` (user-gesture entry point), `pause()`, `toggle()`, `next()`, `prev()` (whole-card jumps), `replayCard()`, `seekToCard(i)`, `setRate(r)`, `setGap(s)`, `stop()` (teardown), and `playClip(kind, id)` — one-shot playback for the practice-mode speaker button (no gap, no auto-advance; respects the speed setting).

**Mastery isolation:** the service never imports `setCardRating` or touches sessions. Read-only against card data and settings.

**Settings:** `playbackRate` and `recallGapSeconds` are added to `AppSettings` (new optional keys with defaults — existing localStorage keys and shapes are untouched; unknown keys absent in stored settings fall back to defaults via the existing spread pattern).

## 3. Study view UI — two modes

The study view (`civic-study.ts`) hosts both modes. Session setup, types, and category filters stay in the existing launcher, untouched.

### Practice mode (today's study mode — the only scored path)

Unchanged, plus one addition: a **read-aloud speaker button on the card face**. On the question side it plays that question's clip; once flipped, it plays the answer clip. One-shot (`playClip`), no gap, no auto-advance, no interaction with the loop machinery.

`<flash-card>` grows an optional `audio` attribute/flag that renders the speaker button and dispatches a `speak` event; the study view wires it to the service. The button renders only for cards with audio (`hasAudio(id)`) and only in practice mode — in listen mode narration is already running.

### Listen mode (the toggle — passive, never scored)

The session bar gains a small segmented **Study | Listen** toggle (Federal Editorial: hairline pill, gold active segment, small-caps labels). Flipping it on is the audio-unlocking user gesture.

While on:
- Rating bar and Still Learning / I Know This buttons hide; a **player bar** slides in along the bottom of the study area.
- Playback starts at the current card: question plays → question face shows a quiet countdown in the hint line ("answer in 3…") during the recall gap → **card flips exactly when the answer clip starts** (driven by `position$.phase`) → auto-advance through the session's existing card order.
- The existing prev/next arrows become player prev/next. Card tap no longer flips — the loop owns the flip.
- **Player bar:** segmented timeline — one chunk per session card, width proportional to that card's `q + gap + a` duration, hairline separators, gold progress fill, tap-to-seek — plus elapsed/total time in tabular figures, replay, play/pause (primary navy), speed cycle (0.75× / 1× / 1.25× / 1.5×), and the gap-length select (3/5/8 s).
- **Keyboard:** Space = play/pause (replaces flip), ←/→ = prev/next card, R = replay, Esc = unchanged (exit session; also stops audio).

Flipping the toggle off: audio stops immediately, player bar hides, rating bar returns, manual practice resumes on the same card. Ratings made before toggling survive and save as usual.

**Completion:** when listen playback walks off the end of the queue, a quiet completion state appears — "You listened through N cards, M minutes" — with Replay, Switch to Study, and Back to Dashboard. No confetti, no score. Leaving the study route (`disconnectedCallback`) calls `AudioPlayer.stop()` — no ghost audio.

The session-bar progress (rated count) and the player bar (listening position) coexist; only one is visually prominent per mode.

**Styling:** all new CSS in `src/styles/index.css` using Federal Editorial tokens (hairlines, `--gold` accents, `--navy` primary, tabular figures, 6px radius). Light DOM throughout. Implementation deviation: the mode toggle's active segment shipped navy (`--navy`) instead of gold — white text on `--gold` fails AA contrast.

## 4. Offline & PWA

- New `runtimeCaching` entry in `vite.config.ts` beside the Google Fonts rule: pattern matching `/civic-flash-cards/audio/.*\.mp3`, handler `CacheFirst`, cacheName `card-audio`, ~300 max entries, 1-year expiration, **`rangeRequests: true`** — iOS Safari fetches audio with Range requests and cached responses will not play there without the range-requests plugin.
- Precache globs must not include `.mp3` — installing the PWA does not front-load ~6 MB of audio.
- Accepted trade-off: clips heard at least once are available offline; never-fetched clips are not. A "download all audio" action is a possible later addition, not v1.
- `manifest.json` is bundled into the JS at build time, so clip URLs and durations are always available offline; only the MP3s are network-dependent.

## 5. Error handling

- **Card without audio** (new card, clips not yet generated): practice mode hides the speaker button; listen mode shows the card silently through its phases (question face → gap → flip → short fixed dwell) and advances. The loop never stalls on a missing file.
- **Fetch/decode failure mid-play** (e.g. offline, uncached clip): same skip-forward path, plus one quiet toast per session ("Some audio isn't available offline").
- **Generation script:** incremental manifest writes make runs resumable; failures are per-clip, logged, summarized, non-zero exit.

## 6. Testing

- **Vitest, pure logic only** (first test infra in the repo, kept minimal):
  - `speakText()` fallback transform against real card texts (brackets, parentheses, semicolons);
  - queue building and duration math (chunk widths, gap/speed interaction);
  - manifest hash stability (same text+voice → same hash; changed text → changed hash).
- **Manual verification checklist:** toggle listen on/off mid-session; pause during recall gap and resume mid-gap; seek by tapping timeline chunks; speaker button on both card faces; offline replay of previously heard clips; keyboard shortcuts in both modes; `npm run build` type-checks clean.
- **Known, documented limitation:** chained clips pause under iOS screen lock. The stitched podcast tracks (fast follow) are the answer there; no engineering around it in v1.

## Out of scope (v1) / fast follows

- Stitched per-category and full-deck "podcast" MP3s (ffmpeg concat with baked-in silences) + Media Session API for lock-screen/commute listening. The per-clip files and manifest from this design are their direct input.
- "Download all audio" for full offline coverage.
- Exposure tracking ("last listened") — listening stays stateless in v1.

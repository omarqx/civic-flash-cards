# Civic Flash Cards

A PWA for mastering the 128 USCIS Naturalization Civics Test questions using spaced-repetition flashcards.

## Commands

- `npm run dev` — Vite dev server (http://localhost:5173)
- `npm run build` — TypeScript type-check + Vite production build
- `npm run preview` — Serve the production build locally
- `npx tsc --noEmit` — Type-check only (no emit)
- `npm run generate:audio` — Regenerate card narration MP3s from the local Kokoro TTS server (requires `http://localhost:8880` and `ffmpeg` on PATH; clips are transcoded to 48 kbps mono; only changed clips regenerate). Flags: `--dry-run`, `--sample <id>`, `--force`. Env: `TTS_URL`, `TTS_VOICE`.

## Critical Rules

- **Card IDs are immutable** — IDs are `localStorage` mastery keys. Never renumber existing cards in `src/data/flashcards.ts`. (IDs follow the official 2025 USCIS numbering.)
- **Light DOM only** — Web Components render into the light DOM (no Shadow DOM). All styling comes from `src/styles/index.css`.
- **Direct RxJS imports** — Import from `rxjs/internal/*` sub-modules, never from barrel `rxjs` or `rxjs/operators`. See [Performance](.claude/performance.md).

## Guidelines

- [Architecture](.claude/architecture.md) — Web Components, routing, state management
- [TypeScript](.claude/typescript.md) — Types, patterns, strict mode conventions
- [Performance](.claude/performance.md) — Bundle optimization skills
- [Design System](.claude/design-system.md) — Federal Editorial theme tokens

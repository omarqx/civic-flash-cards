# Civic Flash Cards

A progressive web app for mastering all **128 USCIS Naturalization Civics Test** questions using spaced-repetition flashcards.

**Live app → [omarqx.github.io/civic-flash-cards](https://omarqx.github.io/civic-flash-cards/)**

---

## Features

- **128 official questions** from the 2025 USCIS Civics Test, organised into 8 categories
- **Spaced repetition** — cards you find harder appear more often
- **Study sessions** — rate each card 0–5 and track your mastery over time
- **Card library** — search, filter by category or mastery level, and flip any card inline
- **Statistics view** — session history, per-category mastery rings, and aggregate progress
- **PWA / offline** — installable on iOS and Android, works without a network connection
- **Keyboard-first** — full keyboard navigation and hotkeys for power users
- **Patriotic Brutalism** design — bold red-white-blue theme with Oswald + Barlow typefaces

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Go to Dashboard |
| `2` | Go to Library |
| `?` | Open keyboard shortcuts modal |
| `Space` | Flip card (study mode) |
| `←` / `→` | Previous / next card |
| `0` – `5` | Rate current card |
| `F` | Focus search (library) |
| `M` | Toggle mastered filter (library) |

## Categories

| Code | Category |
|------|----------|
| A | Principles of American Government |
| B | System of Government |
| C | Rights and Responsibilities |
| D | Colonial Period and Independence |
| E | 1800s |
| F | Recent American History |
| G | Geography |
| H | Symbols and Holidays |

## Tech Stack

- **Vite 6** — build tooling and dev server
- **TypeScript** — strict mode, type-checked entry point
- **RxJS 7** — reactive keyboard handling and event streams
- **vite-plugin-pwa** — service worker and Web App Manifest for offline support
- Vanilla JS modules (no framework) — light DOM, zero runtime overhead
- **GitHub Actions** — automated deployment to GitHub Pages on every push to `main`

## Local Development

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

## Project Structure

```
civic-flash-cards/
├── css/
│   └── index.css          # Patriotic Brutalism design system
├── js/
│   ├── data.js            # 128 USCIS questions + category definitions
│   ├── store.js           # Spaced-repetition state, localStorage persistence
│   ├── router.js          # Hash-based SPA router
│   ├── components.js      # Shared UI render functions
│   ├── dashboard.js       # Dashboard view
│   ├── study.js           # Study mode (card flip + ratings)
│   ├── library.js         # Card library (search + filter)
│   └── app.js             # App bootstrap, keyboard handling, nav
├── src/
│   └── main.ts            # Vite / TypeScript entry point
├── public/
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Data & Privacy

All study progress is stored locally in `localStorage` — nothing is sent to any server. Resetting progress clears only the app's own keys.

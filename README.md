# Civic Flash Cards

A progressive web app for mastering all **128 USCIS Naturalization Civics Test** questions using spaced-repetition flashcards.

**Live app → [omarqx.github.io/civic-flash-cards](https://omarqx.github.io/civic-flash-cards/)**

---

## Features

- **128 official questions** from the 2025 USCIS Civics Test across 8 categories
- **Spaced repetition** — cards you struggle with surface more often; mastered cards fade back
- **Study sessions** — rate each card 0–5, session score calculated on completion
- **Card library** — search all 128 questions, filter by category or mastery level, expand to reveal answers inline
- **Statistics** — session history, per-category mastery rings, aggregate progress over time
- **PWA / offline** — installable on iOS and Android, works without a network connection after first load
- **Keyboard-first** — full keyboard navigation and hotkeys for power users
- **Federal Editorial** design — archival paper-and-ink palette, Fraunces + Public Sans, hairline rules, gold-foil accents

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Dashboard |
| `2` | Library |
| `?` | Keyboard shortcuts modal |
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

| Layer | Choice |
|-------|--------|
| Build | Vite 6 |
| Language | TypeScript 5 (strict mode) |
| UI | Vanilla Web Components (light DOM, no framework) |
| Reactivity | RxJS 7 — BehaviorSubjects for state, `fromEvent` for keyboard/nav |
| PWA | vite-plugin-pwa — service worker + Web App Manifest |
| Deployment | GitHub Actions → GitHub Pages |

Non-dashboard views (`study`, `library`, `stats`, `settings`) are lazy-loaded via dynamic `import()` and preloaded on nav-link hover/focus so navigation feels instant.

## Local Development

```bash
npm install
npm run dev       # dev server → http://localhost:5173
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build locally
```

## Project Structure

```
civic-flash-cards/
├── src/
│   ├── components/
│   │   ├── app/
│   │   │   ├── civic-app.ts        # Root shell — router, keyboard, mobile nav
│   │   │   ├── civic-topbar.ts     # Top navigation bar
│   │   │   └── civic-sidebar.ts    # Side navigation
│   │   ├── shared/
│   │   │   ├── flash-card.ts       # Flip card with 3-D animation
│   │   │   ├── mastery-bar.ts      # 5-segment mastery indicator
│   │   │   ├── rating-bar.ts       # 0–5 rating buttons
│   │   │   ├── session-launcher.ts # Session type cards on dashboard
│   │   │   ├── card-brutal.ts      # Library card tile
│   │   │   ├── card-detail-modal.ts# Card detail overlay
│   │   │   ├── stat-colored.ts     # Coloured stat block
│   │   │   ├── trend-chart.ts      # Mini session score trend
│   │   │   └── civic-toast.ts      # Toast notification system
│   │   └── views/
│   │       ├── civic-dashboard.ts  # Dashboard (eagerly loaded)
│   │       ├── civic-study.ts      # Study mode (lazy)
│   │       ├── civic-library.ts    # Card library (lazy)
│   │       ├── civic-stats.ts      # Statistics (lazy)
│   │       └── civic-settings.ts   # Settings (lazy)
│   ├── data/
│   │   └── flashcards.ts           # 128 questions + category definitions
│   ├── router/
│   │   └── router.ts               # Hash-based SPA router
│   ├── state/
│   │   ├── store.ts                # RxJS reactive store, localStorage persistence
│   │   └── session-manager.ts      # Active study session state
│   ├── styles/
│   │   └── index.css               # Patriotic Brutalism design system
│   ├── types/
│   │   └── index.ts                # Shared TypeScript interfaces
│   └── main.ts                     # Vite entry point
├── public/
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Data & Privacy

All study progress is stored in `localStorage` — nothing leaves your device. Resetting progress clears only the app's own keys (`civic_mastery`, `civic_sessions`, `civic_settings`).

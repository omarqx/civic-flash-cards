# Architecture

## Overview

Vite + TypeScript SPA using **vanilla Web Components** (`HTMLElement` subclasses, no Lit) and **RxJS** for reactive state. All data persisted in `localStorage`. PWA-enabled via `vite-plugin-pwa`.

## Directory Structure

```
src/
├── main.ts                          # Entry point — imports CSS, boots <civic-app>
├── types/index.ts                   # Shared TypeScript interfaces
├── data/flashcards.ts               # 128 USCIS questions + categories + session types
├── state/
│   ├── store.ts                     # Reactive store (BehaviorSubjects → localStorage)
│   └── session-manager.ts           # Active session state (replaces window._activeSession)
├── router/router.ts                 # Hash-based SPA router with RxJS fromEvent
├── styles/index.css                 # Global CSS (Patriotic Brutalism theme)
└── components/
    ├── app/
    │   ├── civic-app.ts             # Root shell — owns router, keyboard, mobile nav
    │   ├── civic-topbar.ts          # Top nav bar
    │   └── civic-sidebar.ts         # Left sidebar nav
    ├── shared/
    │   ├── mastery-bar.ts           # 5-segment mastery indicator
    │   ├── card-brutal.ts           # Card grid item
    │   ├── flash-card.ts            # 3D flippable flashcard
    │   ├── rating-bar.ts            # 0-5 confidence rating buttons
    │   ├── stat-colored.ts          # Colored stat block
    │   ├── trend-chart.ts           # Mini session score bar chart
    │   ├── session-launcher.ts      # Session type launch button
    │   ├── card-detail-modal.ts     # Card detail overlay
    │   └── civic-toast.ts           # Toast notification system
    └── views/
        ├── civic-dashboard.ts       # Dashboard (eagerly loaded)
        ├── civic-study.ts           # Study mode (dynamically imported)
        ├── civic-library.ts         # Card library (dynamically imported)
        ├── civic-stats.ts           # Statistics (dynamically imported)
        └── civic-settings.ts        # Settings (dynamically imported)
```

## Web Component Pattern

All components use **Light DOM** (no Shadow DOM). Pattern:

```typescript
export class MasteryBar extends HTMLElement {
  static observedAttributes = ['level'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  get level(): number {
    return parseInt(this.getAttribute('level') || '0', 10);
  }

  private render() {
    this.innerHTML = `...`;
  }
}

customElements.define('mastery-bar', MasteryBar);
```

- Use `connectedCallback()` for setup, `disconnectedCallback()` for RxJS cleanup
- Dispatch `CustomEvent` for parent communication (e.g., `card-click`, `rate`, `flip`)
- Set properties directly for parent → child data flow (e.g., `el.card = flashcard`)
- Use attributes for primitive values (e.g., `level="4"`)

## Routing

Hash-based: `#/dashboard`, `#/study/:sessionId`, `#/library`, `#/stats`, `#/settings`.

Views register handlers via `Router.register(pattern, handler)`. The `<civic-app>` root component creates/destroys view elements on route change.

Non-dashboard views are **dynamically imported** — they load only when navigated to.

## Data Flow

```
Store (BehaviorSubjects) → localStorage (auto-persist)
     ↕
View Components (read Store, dispatch events)
     ↕
Session Manager (active study session state)
```

## Study Session Lifecycle

1. `Store.createSession(type, categoryFilter?)` — builds card pool using spaced-repetition ordering
2. `SessionManager.set(session)` — stores active session (module-level, not `window.*`)
3. `Store.setCardRating(cardId, rating)` — updates mastery (EMA of last 5 ratings; level ≥ 4 = mastered)
4. `Store.saveSession(session)` — finalizes and persists (capped at 100)

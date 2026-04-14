# TypeScript Conventions

## Overview

Strict TypeScript with `moduleResolution: "bundler"`. All types live in `src/types/index.ts`.

## Rules

### Type Definitions
- All domain types are in `src/types/index.ts` — import from there, don't redeclare
- Use `type` imports for type-only imports: `import type { Flashcard } from '../types'`
- Prefer interfaces over type aliases for object shapes
- Use `Record<K, V>` for maps, not `{ [key: string]: V }`

### Web Component Typing
- Type `querySelector` results: `this.querySelector<HTMLInputElement>('#search')`
- Cast `CustomEvent.detail` at the listener: `(e as CustomEvent<{ cardId: number }>).detail`
- Use `as EventListener` when adding typed CustomEvent handlers to `addEventListener`

### Strict Mode
- No `any` unless interfacing with DOM APIs that require it (e.g., `as any` for `handleKey` delegation)
- No non-null assertions (`!`) unless the element is guaranteed by the component's own `innerHTML`
- Prefer optional chaining (`?.`) over null checks for DOM queries

## Key Types

| Type | Location | Purpose |
|------|----------|---------|
| `Flashcard` | `src/types` | `{ id, q, a, cat }` |
| `CategoryId` | `src/types` | `'A' \| 'B' \| ... \| 'H'` |
| `CardMastery` | `src/types` | Rating history, mastery level, review count |
| `StudySession` | `src/types` | Session metadata, ratings map, score |
| `AppSettings` | `src/types` | `{ hideMastered, shuffleDefault }` |
| `ViewName` | `src/types` | Union of valid route names |

## Examples

### Good
```typescript
import type { Flashcard, CategoryId } from '../types';
import { FLASHCARDS } from '../data/flashcards';

const card: Flashcard = FLASHCARDS[0];
const catId: CategoryId = card.cat;
```

### Avoid
```typescript
// Don't use 'any' for known shapes
const card: any = FLASHCARDS[0];

// Don't redeclare types that exist in src/types
interface Flashcard { id: number; q: string; a: string; cat: string; }
```

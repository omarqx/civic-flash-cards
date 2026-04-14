# Performance Guidelines

## Overview

These rules ensure fast initial load and efficient runtime. Based on project skills in `.gemini/antigravity/skills/`.

## Rules

### 1. Avoid Barrel File Imports (RxJS)

Import from direct sub-module paths, never from `rxjs` or `rxjs/operators` barrels.

```typescript
// ✅ Good — loads only the function needed
import { fromEvent } from 'rxjs/internal/observable/fromEvent';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { map } from 'rxjs/internal/operators/map';

// ❌ Bad — loads entire RxJS module graph
import { fromEvent, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
```

### 2. Dynamic Import Heavy Views

Only `<civic-dashboard>` is eagerly imported. All other views use `import()`:

```typescript
// In civic-app.ts route handlers:
Router.register('library', async () => {
  await import('../views/civic-library');
  main.innerHTML = '';
  main.appendChild(document.createElement('civic-library'));
});
```

### 3. Preload on User Intent

Preload view bundles when the user hovers/focuses nav links:

```typescript
link.addEventListener('mouseenter', () => {
  void import('../views/civic-library');
}, { once: true });
```

### 4. Conditional Module Loading

Load heavy modules only when a feature is activated, not at import time.

### 5. Defer Non-Critical Libraries

PWA service worker registration is already deferred by `vite-plugin-pwa`. Any future analytics or logging should use dynamic `import()`, never static imports.

## Reference

Full skill docs: `.gemini/antigravity/skills/*.md`

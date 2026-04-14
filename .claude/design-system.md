# Design System — Patriotic Brutalism

## Overview

All CSS lives in `src/styles/index.css`. Components render into Light DOM and inherit these styles. Never create per-component CSS files.

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--navy` | `#002868` | Primary background, topbar, buttons |
| `--red` | `#BF0A30` | Accents, destructive actions |
| `--gold-bright` | `#FFD700` | Highlights, active states |
| `--white` | `#FFFFFF` | Card backgrounds, text on dark |
| `--bg` | `#F2F5FF` | Page background |
| `--black` | `#0D1F4A` | Text, borders |

## Typography

| Token | Font | Usage |
|-------|------|-------|
| `--font-display` | `'Oswald'` | Headings, card titles, labels (uppercase) |
| `--font-body` | `'Barlow'` | Body text, descriptions |

## Borders & Shadows

- `--border: 2.5px solid #0D1F4A` — brutalist border on all cards, inputs, buttons
- `--shadow-brutal: 4px 4px 0px #0D1F4A` — offset box shadow (no blur)
- `--shadow-brutal-sm: 2px 2px 0px #0D1F4A` — smaller variant

## Category Classes

Backgrounds: `cat-A` through `cat-H`
Icon colors: `cat-icon-A` through `cat-icon-H`

Each category has a distinct color for its cards, badges, and progress bars.

## Component Classes

| Class | Element |
|-------|---------|
| `.card-brutal` | Grid card container |
| `.flashcard-scene` / `.flashcard` | 3D flip card |
| `.btn` / `.btn-navy` / `.btn-pink` | Buttons |
| `.filter-chip` | Toggleable filter button |
| `.sidebar-box` | Sidebar content block |
| `.stat-colored` | Colored stat block |
| `.mastery-bar` / `.mastery-seg` | 5-segment mastery bar |
| `.toast` / `.toast-out` | Notifications |

## Rules

- Never add `style` attributes for things that should be CSS classes
- Keep all design tokens in `:root` — don't hardcode hex values
- All interactive elements need `border: var(--border)` and `box-shadow: var(--shadow-brutal)` for brutalist consistency

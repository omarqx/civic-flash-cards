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

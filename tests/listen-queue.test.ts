import { describe, it, expect } from 'vitest';
import { buildQueue, MISSING_CLIP_DWELL } from '../src/state/listen-queue';
import type { AudioManifest } from '../src/types';

const manifest: AudioManifest = {
  'q-1': { hash: 'h', duration: 4 },
  'a-1': { hash: 'h', duration: 6 },
  'q-2': { hash: 'h', duration: 3 },
  'a-2': { hash: 'h', duration: 5 },
  'q-4': { hash: 'h', duration: 4 },
  // no a-4: one-missing-clip case
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

  it('uses MISSING_CLIP_DWELL only for the missing side when one clip is present', () => {
    const q = buildQueue([4], manifest, 5, 2);
    expect(q.items[0].qDuration).toBe(4);
    expect(q.items[0].aDuration).toBe(0);
    expect(q.items[0].total).toBe(4 / 2 + 5 + MISSING_CLIP_DWELL);
  });

  it('handles an empty id list', () => {
    const q = buildQueue([], manifest, 5, 1);
    expect(q.items).toHaveLength(0);
    expect(q.totalDuration).toBe(0);
  });
});

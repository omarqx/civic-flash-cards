/**
 * Pure queue math for listen mode. No DOM, no manifest import —
 * the manifest is passed in so this stays unit-testable.
 */
import type { AudioManifest, ListenQueue, ListenQueueItem } from '../types';

/** Wall-clock seconds a phase dwells when its clip is missing. */
export const MISSING_CLIP_DWELL = 4;

export function buildQueue(
  cardIds: number[],
  manifest: AudioManifest,
  gapSeconds: number,
  rate: number,
): ListenQueue {
  const items: ListenQueueItem[] = [];
  let offset = 0;
  for (const cardId of cardIds) {
    const q = manifest[`q-${cardId}`];
    const a = manifest[`a-${cardId}`];
    const qPlay = q ? q.duration / rate : MISSING_CLIP_DWELL;
    const aPlay = a ? a.duration / rate : MISSING_CLIP_DWELL;
    const total = qPlay + gapSeconds + aPlay;
    items.push({
      cardId,
      qDuration: q?.duration ?? 0,
      aDuration: a?.duration ?? 0,
      gap: gapSeconds,
      total,
      startOffset: offset,
    });
    offset += total;
  }
  return { items, totalDuration: offset, gapSeconds, rate };
}

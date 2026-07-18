import { describe, it, expect } from 'vitest';
import { clipUrl, clipDuration, hasClip, hasAudio, getManifest } from '../src/data/audio-manifest';

describe('audio-manifest accessor', () => {
  // Derive expectations from the same BASE_URL clipUrl() uses ('/' under
  // vitest, '/civic-flash-cards/' in a production build) so the tests stay
  // valid regardless of the configured base.
  const base = import.meta.env.BASE_URL;

  it('builds base-aware, hash-versioned clip URLs for entries present in the manifest', () => {
    // The manifest is the real generated one, so q-17 exists and clipUrl
    // appends its hash for cache-busting against the CacheFirst SW rule.
    expect(clipUrl('q', 17)).toMatch(new RegExp(`^${base}audio/q-17\\.mp3\\?v=[0-9a-f]{8}$`));
  });

  it('returns a bare URL (no version suffix) for a clip missing from the manifest', () => {
    expect(clipUrl('q', 999)).toBe(`${base}audio/q-999.mp3`);
  });

  it('reports duration 0 and hasClip false for entries missing from the manifest', () => {
    // Runs against the committed manifest; before generation it is the {} stub,
    // after generation these still hold for a nonexistent id.
    expect(clipDuration('q', 999)).toBe(0);
    expect(hasClip('q', 999)).toBe(false);
    expect(hasAudio(999)).toBe(false);
  });

  it('getManifest returns the parsed manifest object', () => {
    expect(typeof getManifest()).toBe('object');
  });
});

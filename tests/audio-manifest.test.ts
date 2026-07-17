import { describe, it, expect } from 'vitest';
import { clipUrl, clipDuration, hasClip, hasAudio, getManifest } from '../src/data/audio-manifest';

describe('audio-manifest accessor', () => {
  it('builds base-aware clip URLs', () => {
    expect(clipUrl('q', 17)).toBe('/audio/q-17.mp3');
    expect(clipUrl('a', 17)).toBe('/audio/a-17.mp3');
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

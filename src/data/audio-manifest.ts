/**
 * Build-time-bundled audio manifest. Vite inlines the JSON, so clip URLs
 * and durations are available offline and synchronously — only the MP3s
 * themselves are fetched at runtime.
 */
import manifestJson from '../../public/audio/manifest.json';
import type { AudioManifest, ClipKind } from '../types';

const manifest = manifestJson as AudioManifest;

export function getManifest(): AudioManifest {
  return manifest;
}

export function clipUrl(kind: ClipKind, id: number): string {
  const base = `${import.meta.env.BASE_URL}audio/${kind}-${id}.mp3`;
  // Cache-bust with the clip's manifest hash: URLs are otherwise stable while
  // content changes on regeneration, and the CacheFirst SW rule (1-year) would
  // serve stale audio to installed clients forever. Missing clips produce no
  // fetch anyway, so leave those bare.
  const entry = manifest[`${kind}-${id}`];
  return entry ? `${base}?v=${entry.hash.slice(0, 8)}` : base;
}

export function clipDuration(kind: ClipKind, id: number): number {
  return manifest[`${kind}-${id}`]?.duration ?? 0;
}

export function hasClip(kind: ClipKind, id: number): boolean {
  return `${kind}-${id}` in manifest;
}

export function hasAudio(id: number): boolean {
  return hasClip('q', id) && hasClip('a', id);
}

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
  return `${import.meta.env.BASE_URL}audio/${kind}-${id}.mp3`;
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

/**
 * Pure text logic for audio generation.
 * speakText: mechanical fallback used when a card has no hand-authored
 * spoken answer in src/data/spoken-answers.ts. Questions are read verbatim
 * and never pass through this transform.
 */
import { createHash } from 'node:crypto';

export function speakText(text: string): string {
  return text
    .replace(/\s*\[[^\]]*\]/g, '')   // [bracketed editorial notes]
    .replace(/\s*\([^)]*\)/g, '')    // (parenthetical alternates/abbreviations)
    .replace(/;/g, '.')              // list separators → sentence breaks
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();
}

export function clipHash(spokenText: string, voice: string): string {
  return createHash('sha256').update(`${voice}\n${spokenText}`).digest('hex');
}

import { CARDS_A } from '../src/data/cards/a.ts';
import { CARDS_B } from '../src/data/cards/b.ts';
import { CARDS_C } from '../src/data/cards/c.ts';
import { CARDS_D } from '../src/data/cards/d.ts';
import { CARDS_E } from '../src/data/cards/e.ts';
import { CARDS_F } from '../src/data/cards/f.ts';
import { CARDS_G } from '../src/data/cards/g.ts';
import { CARDS_H } from '../src/data/cards/h.ts';

const requireContent = process.argv.includes('--require-content');
const all = [...CARDS_A, ...CARDS_B, ...CARDS_C, ...CARDS_D, ...CARDS_E, ...CARDS_F, ...CARDS_G, ...CARDS_H];
const errors: string[] = [];

if (all.length !== 128) errors.push(`expected 128 cards, got ${all.length}`);
const ids = new Set(all.map(c => c.id));
if (ids.size !== all.length) errors.push('duplicate ids');
for (let i = 1; i <= 128; i++) if (!ids.has(i)) errors.push(`missing id ${i}`);

const RANGES: Record<string, [number, number]> = { A: [1,15], B: [16,62], C: [63,72], D: [73,89], E: [90,99], F: [100,118], G: [119,124], H: [125,128] };
for (const c of all) {
  const [lo, hi] = RANGES[c.cat] ?? [0, -1];
  if (c.id < lo || c.id > hi) errors.push(`card ${c.id}: cat ${c.cat} out of official range`);
  if (!c.answers || c.answers.length < 1) errors.push(`card ${c.id}: no answers`);
  if (c.answers.some(a => !a.trim())) errors.push(`card ${c.id}: empty answer entry`);
  if (c.requires < 1 || c.requires > 5) errors.push(`card ${c.id}: requires ${c.requires}`);
  if (c.requires > c.answers.length) errors.push(`card ${c.id}: requires > answers`);
  for (const r of c.related ?? []) {
    if (r === c.id) errors.push(`card ${c.id}: self-link`);
    if (!ids.has(r)) errors.push(`card ${c.id}: related ${r} does not exist`);
  }
  if (requireContent) {
    if (!c.why?.trim()) errors.push(`card ${c.id}: missing why`);
    if (!c.hint?.trim() && !c.note?.trim()) errors.push(`card ${c.id}: missing hint`);
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`audit ok: 128 cards${requireContent ? ' with full content' : ''}`);

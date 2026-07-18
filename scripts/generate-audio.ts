/**
 * generate-audio — pre-generate card narration from a local Kokoro TTS server.
 *
 * Usage:
 *   npm run generate:audio                 # regenerate missing/changed clips
 *   npm run generate:audio -- --dry-run    # print planned work, no network
 *   npm run generate:audio -- --sample 126 # generate one card (voice audition)
 *   npm run generate:audio -- --force      # regenerate everything
 *
 * Env: TTS_URL (default http://localhost:8880), TTS_VOICE (default af_heart)
 *
 * Requires ffmpeg on PATH (clips are transcoded to 48 kbps mono MP3).
 * Never runs in CI or `npm run build` — the committed MP3s are the artifact.
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { parseBuffer } from 'music-metadata';
import { FLASHCARDS } from '../src/data/flashcards';
import { SPOKEN_ANSWERS } from '../src/data/spoken-answers';
import { speakText, clipHash } from './lib/spoken-text';
import type { AudioManifest } from '../src/types';

const TTS_URL = process.env.TTS_URL ?? 'http://localhost:8880';
const VOICE = process.env.TTS_VOICE ?? 'af_heart';
const AUDIO_DIR = new URL('../public/audio/', import.meta.url);
const MANIFEST_PATH = new URL('manifest.json', AUDIO_DIR);

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const sampleIdx = args.indexOf('--sample');
const SAMPLE_ID = sampleIdx >= 0 ? Number(args[sampleIdx + 1]) : null;

interface Job { key: string; file: string; text: string; }

function buildJobs(): Job[] {
  const cards = SAMPLE_ID !== null ? FLASHCARDS.filter(c => c.id === SAMPLE_ID) : FLASHCARDS;
  if (SAMPLE_ID !== null && cards.length === 0) {
    console.error(`No card with id ${SAMPLE_ID}`);
    process.exit(1);
  }
  return cards.flatMap(card => [
    { key: `q-${card.id}`, file: `q-${card.id}.mp3`, text: card.q },
    { key: `a-${card.id}`, file: `a-${card.id}.mp3`, text: SPOKEN_ANSWERS[card.id] ?? speakText(card.answers.join('; ')) },
  ]);
}

async function loadManifest(): Promise<AudioManifest> {
  try { return JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as AudioManifest; }
  catch { return {}; }
}

async function saveManifest(m: AudioManifest): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

async function synthesize(text: string): Promise<Buffer> {
  const res = await fetch(`${TTS_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'kokoro', voice: VOICE, input: text, response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Transcode a TTS MP3 to 48 kbps mono 24 kHz — speech needs nothing more. */
function transcode(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-ac', '1', '-ar', '24000', '-b:a', '48k',
      '-f', 'mp3', 'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    const out: Buffer[] = [];
    const err: Buffer[] = [];
    ff.stdout.on('data', (c: Buffer) => out.push(c));
    ff.stderr.on('data', (c: Buffer) => err.push(c));
    ff.on('error', (e: NodeJS.ErrnoException) => {
      reject(e.code === 'ENOENT'
        ? new Error('ffmpeg is required for audio generation — brew install ffmpeg')
        : e);
    });
    ff.on('close', code => {
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(err).toString().trim()}`));
    });
    ff.stdin.on('error', () => {}); // EPIPE if ffmpeg dies early; 'close' reports the real error
    ff.stdin.end(buffer);
  });
}

async function main(): Promise<void> {
  await mkdir(AUDIO_DIR, { recursive: true });
  const manifest = await loadManifest();
  const jobs = buildJobs();
  const wantedKeys = new Set(jobs.map(j => j.key));

  const existingFiles = new Set(
    (await readdir(AUDIO_DIR)).filter(f => f.endsWith('.mp3'))
  );

  const pending = jobs.filter(j => {
    const hash = clipHash(j.text, VOICE);
    return FORCE || manifest[j.key]?.hash !== hash || !existingFiles.has(j.file);
  });

  console.log(`${jobs.length} clips total; ${pending.length} to generate (voice: ${VOICE})`);
  if (DRY_RUN) {
    for (const j of pending) console.log(`  would generate ${j.file}: "${j.text.slice(0, 60)}…"`);
    return;
  }

  let failed = 0;
  for (const [i, job] of pending.entries()) {
    try {
      const mp3 = await transcode(await synthesize(job.text));
      const meta = await parseBuffer(mp3, 'audio/mpeg');
      const duration = Math.round((meta.format.duration ?? 0) * 100) / 100;
      if (!duration) throw new Error('could not read duration');
      await writeFile(new URL(job.file, AUDIO_DIR), mp3);
      manifest[job.key] = { hash: clipHash(job.text, VOICE), duration };
      await saveManifest(manifest); // incremental: interrupted runs resume
      console.log(`  [${i + 1}/${pending.length}] ${job.file} (${duration}s)`);
    } catch (e) {
      failed++;
      console.error(`  FAILED ${job.file}: ${(e as Error).message}`);
    }
  }

  // Orphan cleanup only on full runs (a --sample run must not delete the deck)
  if (SAMPLE_ID === null) {
    for (const key of Object.keys(manifest)) {
      if (!wantedKeys.has(key)) {
        delete manifest[key];
        await unlink(new URL(`${key}.mp3`, AUDIO_DIR)).catch(() => {});
        console.log(`  removed orphan ${key}.mp3`);
      }
    }
    await saveManifest(manifest);
  }

  console.log(`Done. ${pending.length - failed} generated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });

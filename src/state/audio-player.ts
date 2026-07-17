/**
 * AudioPlayer — singleton narration engine over one shared <audio> element.
 * Phase machine per card: question → gap (silent recall) → answer → advance.
 * Purely passive: reads settings, never writes ratings/mastery/sessions.
 */
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { interval } from 'rxjs/internal/observable/interval';
import type { Subscription } from 'rxjs/internal/Subscription';

import { Store } from './store';
import { buildQueue, MISSING_CLIP_DWELL } from './listen-queue';
import { getManifest, clipUrl, hasClip } from '../data/audio-manifest';
import { showToast } from '../components/shared/civic-toast';
import type { ClipKind, ListenPhase, ListenQueue, PlayerPosition, PlayerStatus } from '../types';

const status$ = new BehaviorSubject<PlayerStatus>('idle');
const queue$ = new BehaviorSubject<ListenQueue | null>(null);
const position$ = new BehaviorSubject<PlayerPosition>({
  cardIndex: 0, phase: 'question', cardElapsed: 0, totalElapsed: 0, phaseRemaining: 0,
});

let audio: HTMLAudioElement | null = null;
let cardIds: number[] = [];
let index = 0;
let phase: ListenPhase = 'question';
let silence = false;           // current phase is timer-driven (gap or missing clip)
let silenceMs = 0;             // full length of the current silent phase
let gapDeadline = 0;           // epoch ms when the silent phase ends
let gapRemaining = 0;          // ms left when paused mid-silence
let gapTimer: ReturnType<typeof setTimeout> | null = null;
let tickerSub: Subscription | null = null;
let oneShot = false;           // playClip() in flight — ended must not advance
let errorToastShown = false;

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
  }
  return audio;
}

const rate = () => Store.getSettings().playbackRate;
const gapSeconds = () => Store.getSettings().recallGapSeconds;

function rebuildQueue(): void {
  queue$.next(cardIds.length ? buildQueue(cardIds, getManifest(), gapSeconds(), rate()) : null);
}

function clearGapTimer(): void {
  if (gapTimer !== null) { clearTimeout(gapTimer); gapTimer = null; }
}

function startTicker(): void {
  if (tickerSub) return;
  tickerSub = interval(250).subscribe(() => position$.next(currentPosition()));
}

function stopTicker(): void {
  tickerSub?.unsubscribe();
  tickerSub = null;
}

function pushPosition(): void {
  position$.next(currentPosition());
}

function silenceElapsedSec(): number {
  if (!silence) return 0;
  const remaining = gapTimer !== null ? Math.max(0, gapDeadline - Date.now()) : gapRemaining;
  return (silenceMs - remaining) / 1000;
}

function currentPosition(): PlayerPosition {
  const q = queue$.getValue();
  const item = q?.items[index];
  let cardElapsed = 0;
  let phaseRemaining = 0;
  if (q && item) {
    const qPlay = item.qDuration ? item.qDuration / q.rate : MISSING_CLIP_DWELL;
    const aPlay = item.aDuration ? item.aDuration / q.rate : MISSING_CLIP_DWELL;
    const clipElapsed = silence ? silenceElapsedSec() : (audio?.currentTime ?? 0) / q.rate;
    if (phase === 'question') { cardElapsed = clipElapsed; phaseRemaining = qPlay - clipElapsed; }
    else if (phase === 'gap') { cardElapsed = qPlay + silenceElapsedSec(); phaseRemaining = item.gap - silenceElapsedSec(); }
    else { cardElapsed = qPlay + item.gap + clipElapsed; phaseRemaining = aPlay - clipElapsed; }
  }
  return {
    cardIndex: index, phase, cardElapsed,
    totalElapsed: (item?.startOffset ?? 0) + cardElapsed,
    phaseRemaining: Math.max(0, phaseRemaining),
  };
}

function startSilence(ms: number): void {
  clearGapTimer();
  silence = true;
  gapDeadline = Date.now() + ms;
  gapTimer = setTimeout(() => { gapTimer = null; advance(); }, ms);
}

function startPhase(p: ListenPhase): void {
  phase = p;
  status$.next('playing');
  startTicker();
  if (p === 'gap') {
    silenceMs = gapSeconds() * 1000;
    startSilence(silenceMs);
    pushPosition();
    return;
  }
  const kind: ClipKind = p === 'question' ? 'q' : 'a';
  const id = cardIds[index];
  if (!hasClip(kind, id)) {
    silenceMs = MISSING_CLIP_DWELL * 1000;
    startSilence(silenceMs);
    pushPosition();
    return;
  }
  silence = false;
  clearGapTimer();
  const el = ensureAudio();
  oneShot = false;
  el.src = clipUrl(kind, id);
  el.playbackRate = rate();
  void el.play().catch(onError);
  pushPosition();
}

function advance(): void {
  if (phase === 'question') { startPhase('gap'); return; }
  if (phase === 'gap') { startPhase('answer'); return; }
  if (index < cardIds.length - 1) { index++; startPhase('question'); return; }
  finish();
}

function finish(): void {
  stopTicker();
  clearGapTimer();
  silence = false;
  status$.next('complete');
  pushPosition();
}

function onEnded(): void {
  if (oneShot) { oneShot = false; return; }
  if (status$.getValue() !== 'playing') return;
  advance();
}

function onError(): void {
  if (oneShot) { oneShot = false; return; }
  if (status$.getValue() !== 'playing') return;
  if (!errorToastShown) {
    errorToastShown = true;
    showToast("Some audio isn't available offline", 'info');
  }
  advance(); // skip forward — the loop never stalls
}

// ── Public API ──

function load(ids: number[]): void {
  stop();
  cardIds = [...ids];
  index = 0;
  phase = 'question';
  errorToastShown = false;
  rebuildQueue();
  pushPosition();
}

function play(): void {
  if (!cardIds.length) return;
  const s = status$.getValue();
  if (s === 'paused') { resume(); return; }
  if (s === 'playing') return;
  index = Math.min(index, cardIds.length - 1);
  startPhase('question');
}

function pause(): void {
  if (status$.getValue() !== 'playing') return;
  if (silence) {
    gapRemaining = Math.max(0, gapDeadline - Date.now());
    clearGapTimer();
  } else {
    audio?.pause();
  }
  stopTicker();
  status$.next('paused');
  pushPosition();
}

function resume(): void {
  status$.next('playing');
  startTicker();
  if (silence) startSilence(gapRemaining); // silenceMs untouched → elapsed stays correct
  else void audio?.play().catch(onError);
}

function toggle(): void {
  const s = status$.getValue();
  if (s === 'playing') pause();
  else if (s === 'paused') resume();
  else play();
}

function seekToCard(i: number): void {
  if (!cardIds.length) return;
  index = Math.max(0, Math.min(i, cardIds.length - 1));
  startPhase('question'); // seeking is a user gesture — always plays
}

function next(): void { seekToCard(index + 1); }
function prev(): void { seekToCard(index - 1); }
function replayCard(): void { seekToCard(index); }

function setRate(r: number): void {
  Store.updateSettings({ playbackRate: r });
  if (audio && !silence) audio.playbackRate = r;
  rebuildQueue();
}

function setGap(s: number): void {
  Store.updateSettings({ recallGapSeconds: s });
  rebuildQueue(); // an in-flight gap keeps its old length; next gap uses the new one
}

function stop(): void {
  clearGapTimer();
  stopTicker();
  if (audio) { audio.pause(); audio.removeAttribute('src'); }
  silence = false;
  oneShot = false;
  index = 0;
  phase = 'question';
  cardIds = [];
  queue$.next(null);
  status$.next('idle');
}

function playClip(kind: ClipKind, id: number): void {
  if (!hasClip(kind, id)) return;
  if (status$.getValue() === 'playing') return; // the loop owns the element
  const el = ensureAudio();
  oneShot = true;
  el.src = clipUrl(kind, id);
  el.playbackRate = rate();
  void el.play().catch(() => { oneShot = false; });
}

export const AudioPlayer = {
  status$, queue$, position$,
  load, play, pause, toggle, next, prev, replayCard, seekToCard,
  setRate, setGap, stop, playClip,
};

/**
 * <listen-player-bar> — transport + segmented per-card timeline for listen mode.
 * Self-driving: subscribes to AudioPlayer streams; controls call AudioPlayer.
 */
import { Subject } from 'rxjs/internal/Subject';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';

import { AudioPlayer } from '../../state/audio-player';
import { Store } from '../../state/store';
import type { ListenQueue } from '../../types';

const RATES = [0.75, 1, 1.25, 1.5];
const GAPS = [3, 5, 8];

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class ListenPlayerBar extends HTMLElement {
  private destroy$ = new Subject<void>();
  private queue: ListenQueue | null = null;

  connectedCallback() {
    const { playbackRate, recallGapSeconds } = Store.getSettings();
    this.innerHTML = `
      <div class="lpb">
        <div class="lpb-track" id="lpb-track" role="slider" aria-label="Listening progress"></div>
        <div class="lpb-controls">
          <span class="lpb-time" id="lpb-elapsed">0:00</span>
          <div class="lpb-buttons">
            <button class="lpb-btn" id="lpb-replay" aria-label="Replay card"><span class="material-icons-round">replay</span></button>
            <button class="lpb-btn" id="lpb-prev" aria-label="Previous card"><span class="material-icons-round">skip_previous</span></button>
            <button class="lpb-btn lpb-btn-play" id="lpb-play" aria-label="Play or pause"><span class="material-icons-round">play_arrow</span></button>
            <button class="lpb-btn" id="lpb-next" aria-label="Next card"><span class="material-icons-round">skip_next</span></button>
            <button class="lpb-btn lpb-btn-text" id="lpb-rate" aria-label="Playback speed">${playbackRate}×</button>
            <label class="lpb-gap">Gap
              <select id="lpb-gap-select" aria-label="Recall gap seconds">
                ${GAPS.map(g => `<option value="${g}" ${g === recallGapSeconds ? 'selected' : ''}>${g}s</option>`).join('')}
              </select>
            </label>
          </div>
          <span class="lpb-time" id="lpb-total">0:00</span>
        </div>
      </div>
    `;

    this.querySelector('#lpb-play')?.addEventListener('click', () => AudioPlayer.toggle());
    this.querySelector('#lpb-prev')?.addEventListener('click', () => AudioPlayer.prev());
    this.querySelector('#lpb-next')?.addEventListener('click', () => AudioPlayer.next());
    this.querySelector('#lpb-replay')?.addEventListener('click', () => AudioPlayer.replayCard());
    this.querySelector('#lpb-rate')?.addEventListener('click', () => {
      const cur = Store.getSettings().playbackRate;
      const nextRate = RATES[(RATES.indexOf(cur) + 1) % RATES.length];
      AudioPlayer.setRate(nextRate);
      const btn = this.querySelector('#lpb-rate');
      if (btn) btn.textContent = `${nextRate}×`;
    });
    this.querySelector('#lpb-gap-select')?.addEventListener('change', (e) => {
      AudioPlayer.setGap(Number((e.target as HTMLSelectElement).value));
    });
    this.querySelector('#lpb-track')?.addEventListener('click', (e) => {
      const chunk = (e.target as HTMLElement).closest('.lpb-chunk') as HTMLElement | null;
      if (chunk) AudioPlayer.seekToCard(Number(chunk.dataset.index));
    });

    AudioPlayer.queue$.pipe(takeUntil(this.destroy$)).subscribe(q => {
      this.queue = q;
      this.renderTrack();
    });
    AudioPlayer.position$.pipe(takeUntil(this.destroy$)).subscribe(pos => {
      const el = this.querySelector('#lpb-elapsed');
      if (el) el.textContent = fmt(pos.totalElapsed);
      this.updateFill(pos.cardIndex, pos.cardElapsed);
    });
    AudioPlayer.status$.pipe(takeUntil(this.destroy$)).subscribe(s => {
      const icon = this.querySelector('#lpb-play .material-icons-round');
      if (icon) icon.textContent = s === 'playing' ? 'pause' : 'play_arrow';
    });
  }

  disconnectedCallback() {
    this.destroy$.next();
  }

  private renderTrack() {
    const track = this.querySelector('#lpb-track');
    const total = this.querySelector('#lpb-total');
    if (!track) return;
    if (!this.queue) { track.innerHTML = ''; return; }
    if (total) total.textContent = fmt(this.queue.totalDuration);
    track.innerHTML = this.queue.items.map((item, i) => `
      <div class="lpb-chunk" data-index="${i}"
           style="flex-grow:${item.total}"
           title="Card ${item.cardId}">
        <div class="lpb-chunk-fill"></div>
      </div>
    `).join('');
  }

  private updateFill(cardIndex: number, cardElapsed: number) {
    if (!this.queue) return;
    this.querySelectorAll<HTMLElement>('.lpb-chunk').forEach((chunk, i) => {
      const fill = chunk.querySelector('.lpb-chunk-fill') as HTMLElement | null;
      if (!fill) return;
      const item = this.queue!.items[i];
      if (i < cardIndex) fill.style.width = '100%';
      else if (i > cardIndex) fill.style.width = '0%';
      else fill.style.width = `${Math.min(100, (cardElapsed / item.total) * 100)}%`;
      chunk.classList.toggle('current', i === cardIndex);
    });
  }
}

customElements.define('listen-player-bar', ListenPlayerBar);

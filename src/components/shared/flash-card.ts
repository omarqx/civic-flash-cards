/**
 * <flash-card> — 3D flippable flashcard for study mode
 * Properties: card (Flashcard), flipped (boolean)
 * Dispatches: flip
 */
import { CATEGORIES, CAT_CSS, ANSWER_CAPTIONS } from '../../data/flashcards';
import type { Flashcard, CategoryId } from '../../types';

export class FlashCard extends HTMLElement {
  private _card: Flashcard | null = null;
  private _flipped = false;

  set card(val: Flashcard) {
    this._card = val;
    this.render();
  }

  get flipped(): boolean { return this._flipped; }

  set flipped(val: boolean) {
    this._flipped = val;
    const fc = this.querySelector('.flashcard');
    fc?.classList.toggle('flipped', val);
  }

  private _audio = false;

  /** Show read-aloud speaker buttons (practice mode only). */
  set audio(val: boolean) {
    this._audio = val;
    this.render();
  }

  /** Replace the front-face hint line (listen mode's gap countdown). */
  set hint(text: string) {
    const el = this.querySelector('.flashcard-face.front .flashcard-hint');
    if (el) el.textContent = text;
  }

  connectedCallback() {
    this.addEventListener('click', this.handleClick);
    if (this._card) this.render();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  private handleClick = (e: MouseEvent) => {
    const speak = (e.target as HTMLElement).closest('.flashcard-speak');
    if (speak) {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('speak', {
        bubbles: true,
        detail: { kind: (speak as HTMLElement).dataset.kind as 'q' | 'a' },
      }));
      return;
    }
    this.dispatchEvent(new CustomEvent('flip', { bubbles: true }));
  };

  private render() {
    const card = this._card;
    if (!card) return;

    const cat = CATEGORIES[card.cat];
    const css = CAT_CSS[card.cat as CategoryId];
    const corner = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 13V4a3 3 0 0 1 3-3h9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
    const frame = `
      <span class="flashcard-corner tl">${corner}</span>
      <span class="flashcard-corner tr">${corner}</span>
      <span class="flashcard-corner br">${corner}</span>
      <span class="flashcard-corner bl">${corner}</span>
      <span class="flashcard-number">No. ${card.id}</span>
    `;

    const caption = card.answers.length > 1 ? (ANSWER_CAPTIONS[card.requires] ?? 'Any one of:') : '';
    const answersHtml = card.answers.length === 1
      ? `<div class="flashcard-answer ${card.answers[0].length > 220 ? 'long' : ''}">${card.answers[0]}</div>`
      : `<div class="flashcard-answers ${card.answers.length > 8 ? 'cols' : ''}">${
          card.answers.map(a => `<div class="flashcard-answer-item">${a}</div>`).join('')
        }</div>`;
    const footnote = card.note
      ? `<div class="flashcard-footnote">${card.note}</div>`
      : card.hint
        ? `<div class="flashcard-footnote"><span class="flashcard-footnote-label">Hint —</span> ${card.hint}</div>`
        : '';
    const speakBtn = (kind: 'q' | 'a', label: string) => this._audio
      ? `<button class="flashcard-speak" data-kind="${kind}" aria-label="${label}">
           <span class="material-icons-round">volume_up</span>
         </button>`
      : '';

    this.innerHTML = `
      <div class="flashcard-scene">
        <div class="flashcard ${this._flipped ? 'flipped' : ''}" tabindex="0" role="button"
             aria-label="Press Space to flip card">
          <div class="flashcard-face front">
            ${frame}
            ${speakBtn('q', 'Read question aloud')}
            <div class="flashcard-cat-eyebrow ${css}">${cat ? cat.name : ''}</div>
            <div class="flashcard-question">${card.q}</div>
            <div class="flashcard-hint">Press <kbd>Space</kbd> to reveal the answer</div>
          </div>
          <div class="flashcard-face back">
            ${frame}
            ${speakBtn('a', 'Read answer aloud')}
            <div class="flashcard-cat-eyebrow ${css}">Answer</div>
            ${caption ? `<div class="flashcard-answers-caption">${caption}</div>` : ''}
            <div class="flashcard-answer-wrap">${answersHtml}</div>
            ${footnote}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('flash-card', FlashCard);

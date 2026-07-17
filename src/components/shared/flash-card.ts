/**
 * <flash-card> — 3D flippable flashcard for study mode
 * Properties: card (Flashcard), flipped (boolean)
 * Dispatches: flip
 */
import { CATEGORIES, CAT_CSS } from '../../data/flashcards';
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

  connectedCallback() {
    this.addEventListener('click', this.handleClick);
    if (this._card) this.render();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  private handleClick = () => {
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

    this.innerHTML = `
      <div class="flashcard-scene">
        <div class="flashcard ${this._flipped ? 'flipped' : ''}" tabindex="0" role="button"
             aria-label="Press Space to flip card">
          <div class="flashcard-face front">
            ${frame}
            <div class="flashcard-cat-eyebrow ${css}">${cat ? cat.name : ''}</div>
            <div class="flashcard-question">${card.q}</div>
            <div class="flashcard-hint">Press <kbd>Space</kbd> to reveal the answer</div>
          </div>
          <div class="flashcard-face back">
            ${frame}
            <div class="flashcard-cat-eyebrow ${css}">Answer</div>
            <div class="flashcard-answer">${card.a}</div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('flash-card', FlashCard);

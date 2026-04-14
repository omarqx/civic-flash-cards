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

    this.innerHTML = `
      <div class="flashcard-scene">
        <div class="flashcard ${this._flipped ? 'flipped' : ''}" tabindex="0" role="button"
             aria-label="Press Space to flip card">
          <div class="flashcard-face front">
            <span class="flashcard-cat-tag ${css}">${cat ? cat.name.split(' ').slice(0, 2).join(' ').toUpperCase() : ''}</span>
            <span class="flashcard-number">Q${card.id}</span>
            <div class="flashcard-question">${card.q}</div>
            <div class="flashcard-hint">
              <span>◆</span> Click or press Space to reveal
            </div>
          </div>
          <div class="flashcard-face back">
            <span class="flashcard-cat-tag ${css}">${cat ? cat.name.split(' ').slice(0, 2).join(' ').toUpperCase() : ''}</span>
            <span class="flashcard-number">Q${card.id}</span>
            <div class="flashcard-answer-label">Answer</div>
            <div class="flashcard-answer">${card.a}</div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('flash-card', FlashCard);

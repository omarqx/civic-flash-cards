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

    const CAPTIONS: Record<number, string> = {1: 'Any one of:', 2: 'Name two:', 3: 'Name three:', 4: 'Name four:', 5: 'Name five:'};
    const caption = card.answers.length > 1 ? (CAPTIONS[card.requires] ?? 'Any one of:') : '';
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

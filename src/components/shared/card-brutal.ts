/**
 * <card-brutal> — Single card in the brutalist grid
 * Attributes: card-id
 * Dispatches: card-click (detail: { cardId: number })
 */
import { CATEGORIES, CAT_CSS, CAT_ICONS } from '../../data/flashcards';
import { Store } from '../../state/store';
import type { Flashcard, CategoryId } from '../../types';

export class CardBrutal extends HTMLElement {
  private _card: Flashcard | null = null;

  set card(val: Flashcard) {
    this._card = val;
    this.render();
  }

  connectedCallback() {
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'button');
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKey);
    if (this._card) this.render();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKey);
  }

  private handleClick = () => {
    if (this._card) {
      this.dispatchEvent(new CustomEvent('card-click', {
        bubbles: true,
        detail: { cardId: this._card.id },
      }));
    }
  };

  private handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  };

  private render() {
    const card = this._card;
    if (!card) return;

    const cat = CATEGORIES[card.cat];
    const mastery = Store.getCardMastery(card.id);
    const cssClass = CAT_CSS[card.cat as CategoryId];
    const icon = CAT_ICONS[card.cat as CategoryId];

    this.setAttribute('aria-label', `Question ${card.id}: ${card.q.substring(0, 40)}`);
    this.innerHTML = `
      <div class="card-brutal-header ${cssClass}">
        <span>${cat.name.split(' ').slice(0, 2).join(' ').toUpperCase()}</span>
        <span>${icon}</span>
      </div>
      <div class="card-brutal-body">
        <div class="card-brutal-title">${card.q.length > 55 ? card.q.substring(0, 52) + '...' : card.q}</div>
        <div class="card-brutal-desc">${card.a}</div>
      </div>
      <div class="card-brutal-footer">
        <span>Mastery Level</span>
        <span>${mastery.masteryLevel}/5</span>
      </div>
      <div style="padding: 0 12px 12px;">
        <mastery-bar level="${mastery.masteryLevel}"></mastery-bar>
      </div>
    `;
  }
}

customElements.define('card-brutal', CardBrutal);

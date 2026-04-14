/**
 * <card-detail-modal> — Card detail overlay with rating history
 * Properties: cardId (number | null)
 * Dispatches: close, study-card (detail: { cardId: number })
 */
import { FLASHCARDS, CATEGORIES } from '../../data/flashcards';
import { Store } from '../../state/store';
import type { CategoryId } from '../../types';

export class CardDetailModal extends HTMLElement {
  private _cardId: number | null = null;
  private boundKeyHandler = this.handleKey.bind(this);

  set cardId(val: number | null) {
    this._cardId = val;
    if (val !== null) {
      this.render();
      document.addEventListener('keydown', this.boundKeyHandler);
    } else {
      this.innerHTML = '';
      document.removeEventListener('keydown', this.boundKeyHandler);
    }
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.boundKeyHandler);
  }

  private handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
  }

  private close() {
    this._cardId = null;
    this.innerHTML = '';
    document.removeEventListener('keydown', this.boundKeyHandler);
    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  private render() {
    const card = FLASHCARDS.find(c => c.id === this._cardId);
    if (!card) return;

    const mastery = Store.getCardMastery(card.id);
    const cat = CATEGORIES[card.cat];

    this.innerHTML = `
      <div class="card-detail-overlay" id="detail-overlay">
        <div class="card-detail" role="dialog" aria-label="Card detail for question ${card.id}">
          <div class="card-detail-header">
            <div class="card-detail-header-left">
              <span class="tag">Question ${card.id}</span>
              <span class="card-detail-cat-tag cat-${card.cat}">${cat.name}</span>
            </div>
            <button class="card-detail-close" aria-label="Close">
              <span class="material-icons-round">close</span>
            </button>
          </div>
          <div class="card-detail-body">
            <div class="card-detail-section">
              <div class="card-detail-section-title">Question</div>
              <div class="card-detail-section-content" style="font-family: var(--font-display); font-weight: 800; font-size: 1.1rem; text-transform: uppercase;">${card.q}</div>
            </div>
            <div class="card-detail-section">
              <div class="card-detail-section-title">Answer</div>
              <div class="card-detail-section-content">${card.a}</div>
            </div>
            <div class="card-detail-section">
              <div class="card-detail-section-title">Mastery Progress</div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <mastery-bar level="${mastery.masteryLevel}"></mastery-bar>
                <span style="font-weight: 800;">${mastery.masteryLevel}/5</span>
                <span style="margin-left: auto; font-size: 0.75rem; color: var(--gray-400);">
                  ${mastery.reviewCount > 0 ? `Reviewed ${mastery.reviewCount}×` : 'Not yet studied'}
                </span>
              </div>
              ${mastery.lastReviewedAt ? `
                <div style="margin-top: 8px; font-size: 0.75rem; color: var(--gray-400);">
                  Last: ${new Date(mastery.lastReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              ` : ''}
            </div>
            ${mastery.ratingHistory.length > 0 ? `
              <div class="card-detail-section">
                <div class="card-detail-section-title">Rating History</div>
                <div style="display: flex; gap: 3px; flex-wrap: wrap;">
                  ${mastery.ratingHistory.slice(-20).map(r => `
                    <span style="display: inline-flex; align-items: center; justify-content: center;
                      width: 24px; height: 24px; border: 1.5px solid var(--black);
                      font-size: 0.7rem; font-weight: 800;
                      background: ${r.rating >= 4 ? 'var(--green-light)' : r.rating >= 2 ? 'var(--yellow-light)' : 'var(--pink-light)'};">
                      ${r.rating}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div style="display: flex; gap: 8px; margin-top: 16px;">
              <button class="btn btn-pink btn-sm" data-action="study">
                <span class="material-icons-round">play_arrow</span>
                Study This Card
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.querySelector('.card-detail-close')?.addEventListener('click', () => this.close());
    this.querySelector('#detail-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'detail-overlay') this.close();
    });
    this.querySelector('[data-action="study"]')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('study-card', {
        bubbles: true,
        detail: { cardId: card.id },
      }));
      this.close();
    });
  }
}

customElements.define('card-detail-modal', CardDetailModal);

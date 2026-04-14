/**
 * <rating-bar> — 0-5 confidence rating buttons
 * Attributes: visible
 * Dispatches: rate (detail: { rating: number })
 */
export class RatingBar extends HTMLElement {
  static observedAttributes = ['visible'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.updateVisibility(); }

  private updateVisibility() {
    const section = this.querySelector('.rating-section');
    section?.classList.toggle('visible', this.hasAttribute('visible'));
  }

  private render() {
    const labels = ['No Idea', 'Wrong', 'Partial', 'Close', 'Got It', 'Perfect'];
    this.innerHTML = `
      <div class="rating-section ${this.hasAttribute('visible') ? 'visible' : ''}">
        <div class="rating-label">Rate your confidence (0–5)</div>
        <div class="rating-buttons">
          ${labels.map((label, i) => `
            <button class="rating-btn" data-rating="${i}">
              <span class="rating-btn-number">${i}</span>
              <span>${label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.querySelectorAll<HTMLButtonElement>('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating || '0', 10);
        this.dispatchEvent(new CustomEvent('rate', {
          bubbles: true,
          detail: { rating },
        }));
      });
    });
  }
}

customElements.define('rating-bar', RatingBar);

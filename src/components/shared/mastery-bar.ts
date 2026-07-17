/**
 * <mastery-bar> — 5-segment mastery indicator
 * Attributes: level (0–5)
 */
export class MasteryBar extends HTMLElement {
  static observedAttributes = ['level'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  get level(): number {
    return parseInt(this.getAttribute('level') || '0', 10);
  }

  set level(val: number) {
    this.setAttribute('level', String(val));
  }

  private render() {
    const lvl = Math.max(0, Math.min(5, this.level));
    this.innerHTML = `
      <span class="stars-mastery" role="img" aria-label="Mastery level ${lvl} of 5">${
        '★'.repeat(lvl)
      }<span class="off">${'★'.repeat(5 - lvl)}</span></span>
    `;
  }
}

customElements.define('mastery-bar', MasteryBar);

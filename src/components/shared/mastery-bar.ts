/**
 * <mastery-bar> — 5-segment mastery indicator
 * Attributes: level (0–5)
 */
const COLORS = ['filled-green', 'filled-green', 'filled-teal', 'filled-yellow', 'filled-pink'];

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
    const lvl = this.level;
    this.innerHTML = `
      <div class="mastery-bar" aria-label="Mastery level ${lvl} of 5">
        ${[0, 1, 2, 3, 4].map(i =>
          `<span class="mastery-seg ${i < lvl ? COLORS[Math.min(i, COLORS.length - 1)] : ''}"></span>`
        ).join('')}
      </div>
    `;
  }
}

customElements.define('mastery-bar', MasteryBar);

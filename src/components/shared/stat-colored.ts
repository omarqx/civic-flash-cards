/**
 * <stat-colored> — Colored stat block with icon + value + label
 * Attributes: icon, value, label, variant (stat-green, stat-pink, stat-yellow)
 */
export class StatColored extends HTMLElement {
  static observedAttributes = ['icon', 'value', 'label', 'variant'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  private render() {
    const value = this.getAttribute('value') || '0';
    const label = this.getAttribute('label') || '';
    const variant = this.getAttribute('variant') || '';
    this.innerHTML = `
      <div class="ledger-row ${variant}">
        <span class="ledger-row-label"><span class="ledger-dot"></span>${label}</span>
        <span class="ledger-row-value">${value}</span>
      </div>
    `;
  }
}

customElements.define('stat-colored', StatColored);

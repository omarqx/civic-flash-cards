/**
 * <stat-colored> — Colored stat block with icon + value + label
 * Attributes: icon, value, label, variant (stat-green, stat-pink, stat-yellow)
 */
export class StatColored extends HTMLElement {
  static observedAttributes = ['icon', 'value', 'label', 'variant'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  private render() {
    const icon = this.getAttribute('icon') || 'info';
    const value = this.getAttribute('value') || '0';
    const label = this.getAttribute('label') || '';
    const variant = this.getAttribute('variant') || '';

    this.innerHTML = `
      <div class="stat-colored ${variant}">
        <span class="material-icons-round">${icon}</span>
        <span>${value}</span>
        <span class="stat-colored-label">${label}</span>
      </div>
    `;
  }
}

customElements.define('stat-colored', StatColored);

/**
 * <civic-topbar> — Masthead
 * Attributes: active-route (no-op; kept for interface compatibility)
 */

export class CivicTopbar extends HTMLElement {
  static observedAttributes = ['active-route'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { /* masthead has no per-route state */ }

  private render() {
    this.className = 'topbar';
    this.innerHTML = `
      <a href="#/dashboard" class="topbar-brand">Civic Flash Cards</a>
      <span class="topbar-brand-sub">USCIS Civics · 2025 Edition</span>
      <div class="topbar-spacer"></div>
      <button class="topbar-shortcuts" id="btn-keyboard-help" aria-label="Keyboard shortcuts">
        Shortcuts <kbd>?</kbd>
      </button>
    `;

    this.querySelector('#btn-keyboard-help')?.addEventListener('click', () => {
      const modal = document.getElementById('shortcuts-modal') as HTMLDialogElement | null;
      modal?.showModal();
    });
  }
}

customElements.define('civic-topbar', CivicTopbar);

/**
 * <civic-topbar> — Top navigation bar
 * Attributes: active-route
 */
import type { ViewName } from '../../types';

export class CivicTopbar extends HTMLElement {
  static observedAttributes = ['active-route'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.updateActive(); }

  private updateActive() {
    const active = this.getAttribute('active-route') || 'dashboard';
    this.querySelectorAll<HTMLElement>('.topbar-link').forEach(link => {
      link.classList.toggle('active', link.dataset.route === active);
    });
  }

  private render() {
    this.className = 'topbar';
    this.innerHTML = `
      <a href="#/dashboard" class="topbar-brand">Civic Flash Cards</a>
      <nav>
        <ul class="topbar-nav" role="list">
          <li><a href="#/dashboard" class="topbar-link" data-route="dashboard">Dashboard</a></li>
          <li><a href="#/study-launch" class="topbar-link" data-route="study">Study Mode</a></li>
          <li><a href="#/library" class="topbar-link" data-route="library">All Cards</a></li>
        </ul>
      </nav>
      <div class="topbar-spacer"></div>
      <button class="btn btn-navy btn-sm" id="btn-keyboard-help" aria-label="Keyboard shortcuts" style="border-color:rgba(255,255,255,0.3)">
        <span class="material-icons-round" style="font-size:1rem">keyboard</span>
        Shortcuts
      </button>
    `;

    this.updateActive();

    this.querySelector('#btn-keyboard-help')?.addEventListener('click', () => {
      const modal = document.getElementById('shortcuts-modal') as HTMLDialogElement | null;
      modal?.showModal();
    });
  }
}

customElements.define('civic-topbar', CivicTopbar);

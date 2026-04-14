/**
 * <session-launcher> — Session type button (Interview Mock, Daily, etc.)
 * Properties: sessionType (SessionType)
 * Dispatches: launch (detail: { type: string })
 */
import { SESSION_ICONS } from '../../data/flashcards';
import type { SessionType } from '../../types';

export class SessionLauncher extends HTMLElement {
  private _type: SessionType | null = null;

  set sessionType(val: SessionType) {
    this._type = val;
    this.render();
  }

  connectedCallback() {
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'button');
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKey);
    if (this._type) this.render();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKey);
  }

  private handleClick = () => {
    if (this._type) {
      this.dispatchEvent(new CustomEvent('launch', {
        bubbles: true,
        detail: { type: this._type.id },
      }));
    }
  };

  private handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.handleClick(); }
  };

  private render() {
    const t = this._type;
    if (!t) return;
    const icon = SESSION_ICONS[t.id] || '📚';
    this.className = 'session-launcher';
    this.setAttribute('aria-label', `Start ${t.name} — ${t.cardCount} cards`);
    this.innerHTML = `
      <div class="session-launcher-icon">${icon}</div>
      <div class="session-launcher-name">${t.name}</div>
      <div class="session-launcher-meta">${t.cardCount} cards</div>
    `;
  }
}

customElements.define('session-launcher', SessionLauncher);

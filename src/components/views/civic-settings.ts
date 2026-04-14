/**
 * <civic-settings> — Settings view
 */
import { Store } from '../../state/store';
import { showToast } from '../shared/civic-toast';

export class CivicSettings extends HTMLElement {
  connectedCallback() { this.render(); }

  private render() {
    const settings = Store.getSettings();

    this.innerHTML = `
      <div>
        <div class="stats-view-header">
          <h1>Settings</h1>
          <p>Customize your study experience.</p>
        </div>

        <div style="border: var(--border); background: var(--white); padding: 24px; max-width: 480px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <div style="font-weight: 700; font-size: 0.85rem;">Hide Mastered Cards</div>
              <div style="font-size: 0.75rem; color: var(--gray-400);">Hide cards you've already mastered from study sessions</div>
            </div>
            <button class="filter-chip ${settings.hideMastered ? 'active' : ''}" id="settings-hide-mastered">
              ${settings.hideMastered ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style="padding-top: 16px; border-top: var(--border);">
            <button class="btn btn-white" id="settings-reset" style="color: var(--red); border-color: var(--red);">
              <span class="material-icons-round">delete_forever</span>
              Reset All Progress
            </button>
          </div>
        </div>
      </div>
    `;

    this.querySelector('#settings-hide-mastered')?.addEventListener('click', () => {
      const newVal = !Store.getSettings().hideMastered;
      Store.updateSettings({ hideMastered: newVal });
      this.render();
    });

    this.querySelector('#settings-reset')?.addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        Store.resetAll();
        showToast('All progress has been reset.', 'warning');
        this.render();
      }
    });
  }
}

customElements.define('civic-settings', CivicSettings);

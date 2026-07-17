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
          <div class="eyebrow">Preferences</div>
          <h1>Settings</h1>
          <p>Customize your study experience.</p>
          <div class="double-rule"></div>
        </div>

        <div class="settings-panel">
          <div class="setting-row">
            <div>
              <div class="setting-row-title">Hide Mastered Cards</div>
              <div class="setting-row-desc">Hide cards you've already mastered from study sessions</div>
            </div>
            <button class="filter-chip ${settings.hideMastered ? 'active' : ''}" id="settings-hide-mastered">
              ${settings.hideMastered ? 'ON' : 'OFF'}
            </button>
          </div>
          <div class="setting-row setting-row-danger">
            <div>
              <div class="setting-row-title">Reset All Progress</div>
              <div class="setting-row-desc">Erases mastery, sessions, and settings. Cannot be undone.</div>
            </div>
            <button class="btn btn-danger" id="settings-reset">Reset</button>
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

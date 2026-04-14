/**
 * <civic-sidebar> — Left sidebar navigation
 * Attributes: active-route
 */
import { Store } from '../../state/store';
import { showToast } from '../shared/civic-toast';

export class CivicSidebar extends HTMLElement {
  static observedAttributes = ['active-route'];

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.updateActive(); }

  private updateActive() {
    const active = this.getAttribute('active-route') || 'dashboard';
    this.querySelectorAll<HTMLElement>('.nav-link[data-route]').forEach(link => {
      link.classList.toggle('active', link.dataset.route === active);
    });
  }

  private render() {
    this.id = 'sidebar';
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Main navigation');
    this.innerHTML = `
      <ul class="nav-links" role="list">
        <li>
          <a href="#/dashboard" class="nav-link" data-route="dashboard">
            <span class="material-icons-round">home</span>
            <span>Home</span>
          </a>
        </li>
        <li>
          <a href="#/library" class="nav-link" data-route="library">
            <span class="material-icons-round">library_books</span>
            <span>Library</span>
          </a>
        </li>
        <li>
          <a href="#/stats" class="nav-link" data-route="stats">
            <span class="material-icons-round">bar_chart</span>
            <span>Stats</span>
          </a>
        </li>
        <li>
          <a href="#/settings" class="nav-link" data-route="settings">
            <span class="material-icons-round">settings</span>
            <span>Settings</span>
          </a>
        </li>
      </ul>
      <div class="sidebar-footer">
        <button class="sidebar-upgrade" id="btn-reset-progress">Reset Progress</button>
      </div>
    `;

    this.updateActive();

    this.querySelector('#btn-reset-progress')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        Store.resetAll();
        showToast('All progress has been reset.', 'warning');
        window.location.hash = '#/dashboard';
      }
    });

    // Mobile nav: close on link click
    this.querySelectorAll('.nav-link[data-route]').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.classList.remove('open');
          document.querySelector('.sidebar-overlay')?.classList.remove('visible');
          const toggle = document.querySelector('.mobile-nav-toggle');
          if (toggle) toggle.innerHTML = '<span class="material-icons-round">menu</span>';
        }
      });
    });
  }
}

customElements.define('civic-sidebar', CivicSidebar);

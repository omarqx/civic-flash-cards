/**
 * App — Main bootstrap (ES module)
 * Uses RxJS fromEvent for global keyboard handling
 */
import { fromEvent } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { Store } from './store.js';
import { Router } from './router.js';
import { DashboardView } from './dashboard.js';
import { StudyView } from './study.js';
import { LibraryView } from './library.js';
import * as Components from './components.js';

let currentView = null;

function init() {
  // Register routes
  Router.register('dashboard', () => {
    currentView = 'dashboard';
    StudyView.cleanup();
    DashboardView.render();
  });

  Router.register('study/:sessionId', (params) => {
    currentView = 'study';
    StudyView.render(params);
  });

  Router.register('study-launch', () => {
    const session = Store.createSession('daily');
    window._activeSession = session;
    Router.navigate(`#/study/${session.id}`);
  });

  Router.register('library', () => {
    currentView = 'library';
    StudyView.cleanup();
    LibraryView.render();
  });

  Router.register('stats', () => {
    currentView = 'stats';
    StudyView.cleanup();
    renderStatsView();
  });

  Router.register('settings', () => {
    currentView = 'settings';
    StudyView.cleanup();
    renderSettingsView();
  });

  // ── RxJS global keyboard handler ──
  fromEvent(document, 'keydown')
    .pipe(
      filter(e => !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)),
    )
    .subscribe(e => {
      const shortcutsModal = document.getElementById('shortcuts-modal');
      if (shortcutsModal && shortcutsModal.open) {
        if (e.key === 'Escape') shortcutsModal.close();
        return;
      }

      if (currentView === 'study') { StudyView.handleKey(e); return; }
      if (currentView === 'library') { LibraryView.handleKey(e); return; }

      switch (e.key) {
        case '1': e.preventDefault(); Router.navigate('#/dashboard'); break;
        case '2': e.preventDefault(); Router.navigate('#/library'); break;
        case '?': e.preventDefault(); document.getElementById('shortcuts-modal')?.showModal(); break;
      }
    });

  // Shortcuts modal
  const shortcutsBtn = document.getElementById('btn-keyboard-help');
  const shortcutsModal = document.getElementById('shortcuts-modal');
  shortcutsBtn.addEventListener('click', () => shortcutsModal.showModal());
  shortcutsModal.querySelector('.modal-close').addEventListener('click', () => shortcutsModal.close());
  shortcutsModal.addEventListener('click', (e) => { if (e.target === shortcutsModal) shortcutsModal.close(); });

  // Reset button in sidebar
  document.getElementById('btn-reset-progress')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      Store.resetAll();
      showToast('All progress has been reset.', 'warning');
      Router.handleRoute();
    }
  });

  // Mobile nav
  setupMobileNav();

  // Update top nav active states using RxJS
  const updateTopNav = () => {
    const hash = (window.location.hash || '#/dashboard').replace(/^#\/?/, '').split('/')[0] || 'dashboard';
    document.querySelectorAll('.topbar-link').forEach(link => {
      const route = link.dataset.route;
      link.classList.toggle('active', route === hash);
    });
  };

  updateTopNav();
  fromEvent(window, 'hashchange').subscribe(updateTopNav);

  Router.init();
}

function setupMobileNav() {
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'mobile-nav-toggle';
  toggleBtn.innerHTML = '<span class="material-icons-round">menu</span>';
  toggleBtn.setAttribute('aria-label', 'Toggle navigation');
  document.body.appendChild(toggleBtn);

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  const sidebar = document.getElementById('sidebar');

  function toggle() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
    toggleBtn.innerHTML = `<span class="material-icons-round">${sidebar.classList.contains('open') ? 'close' : 'menu'}</span>`;
  }

  toggleBtn.addEventListener('click', toggle);
  overlay.addEventListener('click', toggle);

  sidebar.querySelectorAll('.nav-link[data-route]').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
        toggleBtn.innerHTML = '<span class="material-icons-round">menu</span>';
      }
    });
  });
}

// Toast system
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: 'check_circle', warning: 'warning', error: 'error', info: 'info' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="material-icons-round">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// Stats view
function renderStatsView() {
  const main = document.getElementById('main-content');
  const stats = Store.getMasteryStats();
  const sessions = Store.getSessions();
  const totalCardsReviewed = sessions.reduce((sum, s) => sum + Object.keys(s.ratings).length, 0);
  const avgScore = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length).toFixed(1)
    : '–';

  main.innerHTML = `
    <div>
      <div class="stats-view-header">
        <h1>Statistics</h1>
        <p>Track your progress toward mastering all 128 civics questions.</p>
      </div>

      <div class="stats-grid-4">
        <div class="stat-colored stat-green" style="flex-direction: column; align-items: flex-start; gap: 4px;">
          <span style="font-size: 2rem; font-weight: 800;">${stats.mastered}</span>
          <span class="stat-colored-label" style="margin-left: 0;">Mastered</span>
        </div>
        <div class="stat-colored stat-pink" style="flex-direction: column; align-items: flex-start; gap: 4px;">
          <span style="font-size: 2rem; font-weight: 800;">${stats.inProgress}</span>
          <span class="stat-colored-label" style="margin-left: 0;">In Progress</span>
        </div>
        <div class="stat-colored stat-yellow" style="flex-direction: column; align-items: flex-start; gap: 4px;">
          <span style="font-size: 2rem; font-weight: 800;">${stats.notStarted}</span>
          <span class="stat-colored-label" style="margin-left: 0;">Not Started</span>
        </div>
        <div class="stat-colored" style="flex-direction: column; align-items: flex-start; gap: 4px; background: var(--white);">
          <span style="font-size: 2rem; font-weight: 800;">${sessions.length}</span>
          <span class="stat-colored-label" style="margin-left: 0;">Sessions</span>
        </div>
      </div>

      <div class="section-title"><span class="material-icons-round">category</span> Category Mastery</div>
      <div style="border: var(--border); background: var(--white); padding: 16px; margin-bottom: 24px;">
        ${Components.categoryProgress()}
      </div>

      <div class="section-title"><span class="material-icons-round">history</span> All Sessions</div>
      ${sessions.length === 0
      ? Components.emptyState('history', 'No sessions yet.')
      : `<div class="history-list" role="list">${sessions.map(s => Components.historyItem(s)).join('')}</div>`}
    </div>
  `;
}

// Settings view
function renderSettingsView() {
  const main = document.getElementById('main-content');
  const settings = Store.getSettings();

  main.innerHTML = `
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

  document.getElementById('settings-hide-mastered')?.addEventListener('click', () => {
    const newVal = !Store.getSettings().hideMastered;
    Store.updateSettings({ hideMastered: newVal });
    renderSettingsView();
  });

  document.getElementById('settings-reset')?.addEventListener('click', () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      Store.resetAll();
      showToast('All progress has been reset.', 'warning');
      renderSettingsView();
    }
  });
}

// Expose showToast globally for child modules
window.__app = { showToast };

fromEvent(document, 'DOMContentLoaded').pipe(take(1)).subscribe(() => init());

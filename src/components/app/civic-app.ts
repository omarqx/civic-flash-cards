/**
 * <civic-app> — Root app shell component
 * Owns the router, keyboard handling, and mobile nav
 *
 * Skills applied:
 * - avoid-barrel-file-import: Direct RxJS sub-module imports
 * - dynamic-import-heavy-components: Lazy-load non-dashboard views
 * - preload-based-user-intent: Preload views on nav hover/focus
 * - defer-noncritical-third-party-libraries: Shortcuts modal deferred
 */
import { fromEvent } from 'rxjs/internal/observable/fromEvent';
import { filter } from 'rxjs/internal/operators/filter';

import { Store } from '../../state/store';
import { SessionManager } from '../../state/session-manager';
import { Router } from '../../router/router';
import { showToast } from '../shared/civic-toast';
import type { ViewName } from '../../types';

// Eagerly import shell + dashboard (critical path)
import './civic-topbar';
import './civic-sidebar';
import '../shared/civic-toast';
import '../views/civic-dashboard';

// ── Preload functions for intent-based loading ──
const preloadMap: Record<string, () => Promise<unknown>> = {
  study: () => import('../views/civic-study'),
  library: () => import('../views/civic-library'),
  stats: () => import('../views/civic-stats'),
  settings: () => import('../views/civic-settings'),
};

// Cache loaded modules to avoid re-fetching
const loaded = new Set<string>();

function preloadView(view: string): void {
  if (loaded.has(view) || !preloadMap[view]) return;
  loaded.add(view);
  void preloadMap[view]();
}

export class CivicApp extends HTMLElement {
  private currentView: ViewName | null = null;

  connectedCallback() {
    this.innerHTML = `
      <civic-topbar></civic-topbar>
      <div class="app-body">
        <civic-sidebar></civic-sidebar>
        <main id="main-content" role="main" aria-live="polite"></main>
      </div>
      <civic-toast></civic-toast>
    `;

    this.setupRouter();
    this.setupKeyboard();
    this.setupMobileNav();
    this.setupNavSync();
    this.setupPreloading();
  }

  private setupRouter() {
    const main = this.querySelector('#main-content')!;

    // Dashboard is eagerly imported (critical path)
    Router.register('dashboard', () => {
      this.currentView = 'dashboard';
      main.innerHTML = '';
      main.appendChild(document.createElement('civic-dashboard'));
    });

    // ── Dynamic imports for heavy views (skill: dynamic-import-heavy-components) ──
    Router.register('study/:sessionId', async () => {
      this.currentView = 'study';
      main.innerHTML = '<div class="loading-spinner" aria-label="Loading study mode..."></div>';
      await import('../views/civic-study');
      loaded.add('study');
      main.innerHTML = '';
      main.appendChild(document.createElement('civic-study'));
    });

    Router.register('study-launch', () => {
      const session = Store.createSession('daily');
      if (session) {
        SessionManager.set(session);
        Router.navigate(`#/study/${session.id}`);
      }
    });

    Router.register('library', async () => {
      this.currentView = 'library';
      main.innerHTML = '<div class="loading-spinner" aria-label="Loading library..."></div>';
      await import('../views/civic-library');
      loaded.add('library');
      main.innerHTML = '';
      main.appendChild(document.createElement('civic-library'));
    });

    Router.register('stats', async () => {
      this.currentView = 'stats';
      main.innerHTML = '<div class="loading-spinner" aria-label="Loading statistics..."></div>';
      await import('../views/civic-stats');
      loaded.add('stats');
      main.innerHTML = '';
      main.appendChild(document.createElement('civic-stats'));
    });

    Router.register('settings', async () => {
      this.currentView = 'settings';
      main.innerHTML = '<div class="loading-spinner" aria-label="Loading settings..."></div>';
      await import('../views/civic-settings');
      loaded.add('settings');
      main.innerHTML = '';
      main.appendChild(document.createElement('civic-settings'));
    });

    Router.init();
  }

  // ── Preload on user intent (skill: preload-based-user-intent) ──
  private setupPreloading() {
    // Preload on nav link hover/focus
    this.querySelectorAll<HTMLElement>('[data-route]').forEach(link => {
      const route = link.dataset.route;
      if (route && preloadMap[route]) {
        link.addEventListener('mouseenter', () => preloadView(route), { once: true });
        link.addEventListener('focus', () => preloadView(route), { once: true });
      }
    });

    // Preload study when hovering session launchers on dashboard
    this.addEventListener('mouseenter', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('session-launcher')) {
        preloadView('study');
      }
    }, true);
  }

  private setupKeyboard() {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter(e => !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)),
      )
      .subscribe(e => {
        const shortcutsModal = document.getElementById('shortcuts-modal') as HTMLDialogElement | null;
        if (shortcutsModal?.open) {
          if (e.key === 'Escape') shortcutsModal.close();
          return;
        }

        // Delegate to view components
        if (this.currentView === 'study') {
          const study = this.querySelector('civic-study') as any;
          study?.handleKey(e);
          return;
        }
        if (this.currentView === 'library') {
          const lib = this.querySelector('civic-library') as any;
          lib?.handleKey(e);
          return;
        }

        switch (e.key) {
          case '1': e.preventDefault(); Router.navigate('#/dashboard'); break;
          case '2': e.preventDefault(); Router.navigate('#/library'); break;
          case '?': e.preventDefault(); (document.getElementById('shortcuts-modal') as HTMLDialogElement)?.showModal(); break;
        }
      });
  }

  private setupNavSync() {
    const updateNav = () => {
      const hash = (window.location.hash || '#/dashboard').replace(/^#\/?/, '').split('/')[0] || 'dashboard';
      const topbar = this.querySelector('civic-topbar');
      const sidebar = this.querySelector('civic-sidebar');
      topbar?.setAttribute('active-route', hash);
      sidebar?.setAttribute('active-route', hash);
      document.body.classList.toggle('study-active', hash === 'study');
    };

    updateNav();
    fromEvent(window, 'hashchange').subscribe(updateNav);
  }

  private setupMobileNav() {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-nav-toggle';
    toggleBtn.innerHTML = '<span class="material-icons-round">menu</span>';
    toggleBtn.setAttribute('aria-label', 'Toggle navigation');
    document.body.appendChild(toggleBtn);

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    const sidebar = this.querySelector('civic-sidebar')!;

    function toggle() {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
      toggleBtn.innerHTML = `<span class="material-icons-round">${sidebar.classList.contains('open') ? 'close' : 'menu'}</span>`;
    }

    toggleBtn.addEventListener('click', toggle);
    overlay.addEventListener('click', toggle);
  }
}

customElements.define('civic-app', CivicApp);

/**
 * <civic-dashboard> — Dashboard view with session launchers, card grid, sidebar
 */
import { FLASHCARDS, CATEGORIES, SESSION_TYPES } from '../../data/flashcards';
import { Store } from '../../state/store';
import { SessionManager } from '../../state/session-manager';
import { Router } from '../../router/router';
import { showToast } from '../shared/civic-toast';
import type { Flashcard, CategoryId } from '../../types';

// Ensure child custom elements are registered
import '../shared/session-launcher';
import '../shared/card-brutal';
import '../shared/mastery-bar';
import '../shared/stat-colored';
import '../shared/trend-chart';
import '../shared/card-detail-modal';

export class CivicDashboard extends HTMLElement {
  private categoryFilter = 'all';
  private hideMastered = false;
  private shuffled = false;

  connectedCallback() {
    this.hideMastered = Store.getSettings().hideMastered;
    this.render();
  }

  private render() {
    const stats = Store.getMasteryStats();
    const sessions = Store.getSessions();

    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    this.innerHTML = `
      <div class="dashboard-view">
        <div class="dashboard-main">
          <div class="dashboard-header">
            <div class="eyebrow">${dateStr}</div>
            <h1>${greeting}, Citizen&#8209;to&#8209;be.</h1>
            <p>You've mastered ${stats.mastered} of ${stats.total} questions. Steady on — the oath awaits.</p>
            <div class="double-rule"></div>
          </div>

          <div class="section-head"><h2>Study Plans</h2></div>
          <div class="session-grid" id="session-grid"></div>

          <div class="section-head">
            <h2>Continue where you left off</h2>
            <a class="section-head-link" href="#/library">All ${stats.total} cards →</a>
          </div>
          <div class="filter-bar">
            <select class="filter-select" id="category-filter" aria-label="Filter by category">
              <option value="all">Category: All</option>
              ${(Object.keys(CATEGORIES) as CategoryId[]).map(catId =>
                `<option value="${catId}" ${this.categoryFilter === catId ? 'selected' : ''}>${CATEGORIES[catId].name}</option>`
              ).join('')}
            </select>
            <button class="filter-chip ${this.hideMastered ? 'active' : ''}" id="toggle-hide-mastered">
              <span class="material-icons-round">${this.hideMastered ? 'check_box' : 'check_box_outline_blank'}</span>
              Hide Mastered
            </button>
            <button class="filter-chip" id="toggle-shuffle">
              <span class="material-icons-round">shuffle</span>
              Shuffle
            </button>
          </div>
          <div class="card-grid" id="card-grid"></div>

          <div class="section-head"><h2>Recent Sessions</h2></div>
          ${this.renderHistory(sessions)}
        </div>

        <div class="dashboard-sidebar">
          <div class="progress-ledger">
            <div class="progress-ledger-head">
              <span class="eyebrow eyebrow-quiet">Progress Ledger</span>
              <span class="progress-ledger-star">★</span>
            </div>
            <div class="progress-ledger-big">
              <span class="progress-ledger-num">${stats.mastered}</span>
              <span class="progress-ledger-of">of ${stats.total} mastered</span>
            </div>
            <div class="progress-ledger-rows">
              <stat-colored value="${stats.mastered}" label="Mastered" variant="stat-green"></stat-colored>
              <stat-colored value="${stats.inProgress}" label="In progress" variant="stat-pink"></stat-colored>
              <stat-colored value="${stats.notStarted}" label="Not started" variant="stat-yellow"></stat-colored>
            </div>
            <button class="btn btn-navy" id="start-study-mode">Start Daily Review</button>
          </div>
          <div class="sidebar-box">
            <div class="sidebar-box-header">Mastery Trend</div>
            <div class="mastery-trend"><trend-chart></trend-chart></div>
          </div>
        </div>
      </div>
    `;

    this.renderLaunchers();
    this.renderCardGrid();
    this.attachEvents();
  }

  private renderLaunchers() {
    const grid = this.querySelector('#session-grid')!;
    const types = Object.values(SESSION_TYPES);
    types.forEach(type => {
      const launcher = document.createElement('session-launcher') as InstanceType<typeof import('../shared/session-launcher').SessionLauncher>;
      launcher.sessionType = type;
      grid.appendChild(launcher);
    });
  }

  private getFilteredCards(): Flashcard[] {
    let pool = [...FLASHCARDS];
    if (this.categoryFilter !== 'all') {
      pool = pool.filter(c => c.cat === this.categoryFilter);
    }
    if (this.hideMastered) {
      pool = pool.filter(c => !Store.isCardMastered(c.id));
    }
    if (this.shuffled) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    return pool;
  }

  private renderCardGrid() {
    const grid = this.querySelector('#card-grid')!;
    const filtered = this.getFilteredCards();

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state"><span class="material-icons-round">search_off</span><p>No cards match your filters.</p></div>`;
      return;
    }

    grid.innerHTML = '';
    filtered.slice(0, 6).forEach(card => {
      const el = document.createElement('card-brutal') as InstanceType<typeof import('../shared/card-brutal').CardBrutal>;
      el.className = 'card-brutal';
      el.card = card;
      grid.appendChild(el);
    });

    if (filtered.length > 6) {
      const more = document.createElement('div');
      more.className = 'add-card-placeholder';
      more.tabIndex = 0;
      more.setAttribute('role', 'button');
      more.innerHTML = `<span class="material-icons-round">visibility</span>View all ${filtered.length} cards`;
      more.addEventListener('click', () => Router.navigate('#/library'));
      grid.appendChild(more);
    }
  }

  private renderHistory(sessions: ReturnType<typeof Store.getSessions>): string {
    if (!sessions || sessions.length === 0) {
      return `<div class="empty-state"><span class="material-icons-round">history</span><p>No sessions yet. Start your first study session!</p></div>`;
    }
    const badgeColors: Record<string, string> = { mock: 'cat-D', daily: 'cat-A', weekly: 'cat-B', monthly: 'cat-E', full: 'cat-G' };
    return `<div class="history-list" role="list">${sessions.slice(0, 8).map(s => {
      const date = new Date(s.startedAt);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const reviewed = Object.keys(s.ratings).length;
      return `
        <div class="history-item" tabindex="0" role="listitem">
          <span class="history-item-badge ${badgeColors[s.type] || 'cat-A'}">${s.typeName}</span>
          <div class="history-item-info">
            <div class="history-item-date">${dateStr} · ${timeStr} · ${reviewed}/${s.cardIds.length} cards</div>
          </div>
          <div class="history-item-score">${s.score.toFixed(1)}</div>
        </div>
      `;
    }).join('')}</div>`;
  }

  private startSession(type: string) {
    const session = Store.createSession(type);
    if (!session) return;
    SessionManager.set(session);
    Router.navigate(`#/study/${session.id}`);
  }

  private attachEvents() {
    // Session launchers
    this.addEventListener('launch', ((e: CustomEvent) => {
      this.startSession(e.detail.type);
    }) as EventListener);

    // Card clicks → detail modal
    this.addEventListener('card-click', ((e: CustomEvent) => {
      const modal = document.querySelector('card-detail-modal') as InstanceType<typeof import('../shared/card-detail-modal').CardDetailModal> | null;
      if (modal) modal.cardId = e.detail.cardId;
    }) as EventListener);

    this.querySelector('#start-study-mode')?.addEventListener('click', () => this.startSession('daily'));

    this.querySelector('#category-filter')?.addEventListener('change', (e) => {
      this.categoryFilter = (e.target as HTMLSelectElement).value;
      this.renderCardGrid();
    });

    this.querySelector('#toggle-hide-mastered')?.addEventListener('click', () => {
      this.hideMastered = !this.hideMastered;
      Store.updateSettings({ hideMastered: this.hideMastered });
      this.render();
    });

    this.querySelector('#toggle-shuffle')?.addEventListener('click', () => {
      this.shuffled = true;
      this.renderCardGrid();
    });
  }
}

customElements.define('civic-dashboard', CivicDashboard);

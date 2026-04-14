/**
 * Dashboard View — ES module
 */
import { FLASHCARDS, CATEGORIES, SESSION_TYPES } from './data.js';
import { Store } from './store.js';
import * as Components from './components.js';
import { Router } from './router.js';
import { showDetailFromDashboard } from './library.js';

let categoryFilter = 'all';
let hideMastered = false;
let shuffled = false;

export function render() {
  const main = document.getElementById('main-content');
  const stats = Store.getMasteryStats();
  const sessions = Store.getSessions();
  hideMastered = Store.getSettings().hideMastered;

  main.innerHTML = `
    <div class="dashboard-view">
      <!-- Left: Main Content -->
      <div class="dashboard-main">
        <div class="dashboard-header">
          <h1>My Flashcards</h1>
          <p>Continue your mindful journey and master your deck.</p>
        </div>

        <!-- Session Launchers -->
        <div class="session-grid" id="session-grid">
          ${renderSessionLaunchers()}
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar" id="filter-bar">
          <select class="filter-select" id="category-filter" aria-label="Filter by category">
            <option value="all">Category: All</option>
            ${Object.keys(CATEGORIES).map(catId =>
              `<option value="${catId}" ${categoryFilter === catId ? 'selected' : ''}>${CATEGORIES[catId].name}</option>`
            ).join('')}
          </select>

          <button class="filter-chip ${hideMastered ? 'active' : ''}" id="toggle-hide-mastered">
            <span class="material-icons-round">${hideMastered ? 'check_box' : 'check_box_outline_blank'}</span>
            Hide Mastered
          </button>

          <button class="filter-chip" id="toggle-shuffle">
            <span class="material-icons-round">shuffle</span>
            Shuffle
          </button>
        </div>

        <!-- Card Grid -->
        <div class="card-grid" id="card-grid">
          ${renderCardGrid()}
        </div>

        <!-- Session History -->
        <div class="history-section" id="history-section">
          <div class="history-title">
            <span class="material-icons-round">history</span>
            Recent Sessions
          </div>
          ${renderHistory(sessions)}
        </div>
      </div>

      <!-- Right: Stats Sidebar -->
      <div class="dashboard-sidebar">
        <!-- Start Study button -->
        <button class="btn btn-pink btn-lg" id="start-study-mode" style="width: 100%;">
          Start Study Mode
        </button>

        <!-- Study Statistics -->
        <div class="sidebar-box">
          <div class="sidebar-box-header">
            <span class="material-icons-round" style="font-size: 1rem;">analytics</span>
            Study Statistics
          </div>
          <div class="sidebar-box-body">
            <div class="stat-total">
              <div class="stat-total-label">Total Cards</div>
              <div class="stat-total-value">${stats.total}</div>
            </div>
            ${Components.statColored('check_circle', stats.mastered, 'Mastered', 'stat-green')}
            ${Components.statColored('trending_up', stats.inProgress, 'In Progress', 'stat-pink')}
            ${Components.statColored('schedule', stats.notStarted, 'Not Started', 'stat-yellow')}
          </div>
        </div>

        <!-- Mastery Trend -->
        <div class="sidebar-box">
          <div class="sidebar-box-header">Mastery Trend</div>
          <div class="mastery-trend">
            ${Components.trendChart()}
          </div>
        </div>
      </div>
    </div>
  `;

  attachEvents();
}

function renderSessionLaunchers() {
  const types = Object.values(SESSION_TYPES);
  const icons = { mock: '🎤', daily: '📅', weekly: '📆', monthly: '🗓️', full: '📚' };
  return types.map(type => `
    <div class="session-launcher" tabindex="0" role="button"
         data-type="${type.id}" aria-label="Start ${type.name} — ${type.cardCount} cards">
      <div class="session-launcher-icon">${icons[type.id] || '📚'}</div>
      <div class="session-launcher-name">${type.name}</div>
      <div class="session-launcher-meta">${type.cardCount} cards</div>
    </div>
  `).join('');
}

function getFilteredCards() {
  let pool = [...FLASHCARDS];
  if (categoryFilter !== 'all') {
    pool = pool.filter(c => c.cat === categoryFilter);
  }
  if (hideMastered) {
    pool = pool.filter(c => !Store.isCardMastered(c.id));
  }
  if (shuffled) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  return pool;
}

function renderCardGrid() {
  const filtered = getFilteredCards();
  if (filtered.length === 0) {
    return Components.emptyState('search_off', 'No cards match your filters.');
  }

  return filtered.slice(0, 20).map(card => {
    const cat = CATEGORIES[card.cat];
    const mastery = Store.getCardMastery(card.id);
    const catColors = { A: 'cat-A', B: 'cat-B', C: 'cat-C', D: 'cat-D', E: 'cat-E', F: 'cat-F', G: 'cat-G', H: 'cat-H' };
    const catIcons = { A: '⚖️', B: '🏛️', C: '⚡', D: '🏴', E: '📜', F: '🌐', G: '🗺️', H: '⭐' };

    return `
      <div class="card-brutal" tabindex="0" data-id="${card.id}" role="button"
           aria-label="Question ${card.id}: ${card.q.substring(0, 40)}">
        <div class="card-brutal-header ${catColors[card.cat]}">
          <span>${cat.name.split(' ').slice(0, 2).join(' ').toUpperCase()}</span>
          <span>${catIcons[card.cat] || ''}</span>
        </div>
        <div class="card-brutal-body">
          <div class="card-brutal-title">${card.q.length > 60 ? card.q.substring(0, 57) + '...' : card.q}</div>
          <div class="card-brutal-desc">${card.a}</div>
        </div>
        <div class="card-brutal-footer">
          <span>Mastery Level</span>
          <span>${mastery.masteryLevel}/5</span>
        </div>
        <div style="padding: 0 12px 12px;">
          ${Components.masteryBar(mastery.masteryLevel)}
        </div>
      </div>
    `;
  }).join('') + (filtered.length > 20 ? `
    <div class="add-card-placeholder" tabindex="0" role="button" id="view-all-cards">
      <span class="material-icons-round">visibility</span>
      View all ${filtered.length} cards
    </div>
  ` : '');
}

function renderHistory(sessions) {
  if (!sessions || sessions.length === 0) {
    return Components.emptyState('history', 'No sessions yet. Start your first study session!');
  }
  return `<div class="history-list" role="list">${sessions.slice(0, 8).map(s => Components.historyItem(s)).join('')}</div>`;
}

function startSession(type) {
  const session = Store.createSession(type);
  if (!session) return;
  window._activeSession = session;
  Router.navigate(`#/study/${session.id}`);
}

function attachEvents() {
  document.querySelectorAll('.session-launcher').forEach(el => {
    const handler = () => startSession(el.dataset.type);
    el.addEventListener('click', handler);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });

  document.getElementById('start-study-mode')?.addEventListener('click', () => startSession('daily'));

  document.getElementById('category-filter')?.addEventListener('change', (e) => {
    categoryFilter = e.target.value;
    document.getElementById('card-grid').innerHTML = renderCardGrid();
    attachCardEvents();
  });

  document.getElementById('toggle-hide-mastered')?.addEventListener('click', () => {
    hideMastered = !hideMastered;
    Store.updateSettings({ hideMastered });
    render();
  });

  document.getElementById('toggle-shuffle')?.addEventListener('click', () => {
    shuffled = true;
    document.getElementById('card-grid').innerHTML = renderCardGrid();
    attachCardEvents();
  });

  attachCardEvents();

  document.getElementById('view-all-cards')?.addEventListener('click', () => {
    Router.navigate('#/library');
  });

  document.getElementById('btn-reset-progress')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      Store.resetAll();
      window.__app?.showToast('All progress has been reset.', 'warning');
      render();
    }
  });
}

function attachCardEvents() {
  document.querySelectorAll('.card-brutal[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      const cardId = parseInt(el.dataset.id);
      showDetailFromDashboard(cardId);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const cardId = parseInt(el.dataset.id);
        showDetailFromDashboard(cardId);
      }
    });
  });
}

export const DashboardView = { render };

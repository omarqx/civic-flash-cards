/**
 * Library View — ES module with RxJS debounced search
 */
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { FLASHCARDS, CATEGORIES } from './data.js';
import { Store } from './store.js';
import * as Components from './components.js';
import { Router } from './router.js';

let activeCategories = new Set();
let searchQuery = '';
let hideMastered = false;
let selectedCardId = null;

const destroy$ = new Subject();

export function render() {
  const main = document.getElementById('main-content');
  hideMastered = Store.getSettings().hideMastered;

  // Cleanup previous search subscription
  destroy$.next();

  main.innerHTML = buildLayout();
  attachEvents();
  renderCards();
  setupReactiveSearch();
}

function setupReactiveSearch() {
  const searchInput = document.getElementById('library-search');
  if (!searchInput) return;

  // RxJS debounced search — waits 250ms after the user stops typing
  fromEvent(searchInput, 'input')
    .pipe(
      map(e => e.target.value),
      debounceTime(250),
      distinctUntilChanged(),
      takeUntil(destroy$),
    )
    .subscribe(query => {
      searchQuery = query;
      renderCards();
    });
}

function buildLayout() {
  const stats = Store.getMasteryStats();

  return `
    <div class="library-view">
      <div class="library-header">
        <h1>All Cards</h1>
        <p>Browse and study all 128 USCIS civics questions.</p>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar" id="filter-bar">
        <div class="search-wrapper">
          <span class="material-icons-round">search</span>
          <input type="text" class="search-input" id="library-search"
                 placeholder="Search questions..." aria-label="Search flashcards"
                 value="${searchQuery}">
        </div>

        <select class="filter-select" id="lib-category-filter" aria-label="Filter by category">
          <option value="all">Category: All</option>
          ${Object.keys(CATEGORIES).map(catId =>
            `<option value="${catId}">${CATEGORIES[catId].name}</option>`
          ).join('')}
        </select>

        <button class="filter-chip ${hideMastered ? 'active' : ''}" id="lib-toggle-mastered">
          <span class="material-icons-round">${hideMastered ? 'check_box' : 'check_box_outline_blank'}</span>
          Hide Mastered
        </button>

        <button class="btn btn-pink btn-sm" id="start-filtered-study">
          <span class="material-icons-round">play_arrow</span>
          Study Filtered
        </button>
      </div>

      <!-- Stats Bar -->
      <div class="library-stats">
        <span><span class="library-stat-value" id="lib-showing">${stats.total}</span> showing</span>
        <span><span class="library-stat-value" style="color: var(--green-dark);">${stats.mastered}</span> mastered</span>
        <span><span class="library-stat-value" style="color: var(--pink);">${stats.inProgress}</span> in progress</span>
        <span><span class="library-stat-value" style="color: var(--orange);">${stats.notStarted}</span> not started</span>
      </div>

      <!-- Card Grid -->
      <div class="card-grid" id="card-grid"></div>

      <!-- Card Detail Container -->
      <div id="card-detail-container"></div>
    </div>
  `;
}

function getFilteredCards() {
  let filtered = [...FLASHCARDS];
  if (activeCategories.size > 0) {
    filtered = filtered.filter(c => activeCategories.has(c.cat));
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(c =>
      c.q.toLowerCase().includes(q) || c.a.toLowerCase().includes(q) ||
      CATEGORIES[c.cat].name.toLowerCase().includes(q)
    );
  }
  if (hideMastered) {
    filtered = filtered.filter(c => !Store.isCardMastered(c.id));
  }
  return filtered;
}

function renderCards() {
  const grid = document.getElementById('card-grid');
  if (!grid) return;

  const filtered = getFilteredCards();
  const showingEl = document.getElementById('lib-showing');
  if (showingEl) showingEl.textContent = filtered.length;

  if (filtered.length === 0) {
    grid.innerHTML = Components.emptyState('search_off', 'No cards match your filters.');
    return;
  }

  const catColors = { A: 'cat-A', B: 'cat-B', C: 'cat-C', D: 'cat-D', E: 'cat-E', F: 'cat-F', G: 'cat-G', H: 'cat-H' };
  const catIcons = { A: '⚖️', B: '🏛️', C: '⚡', D: '🏴', E: '📜', F: '🌐', G: '🗺️', H: '⭐' };

  grid.innerHTML = filtered.map(card => {
    const cat = CATEGORIES[card.cat];
    const mastery = Store.getCardMastery(card.id);

    return `
      <div class="card-brutal" tabindex="0" data-id="${card.id}" role="button"
           aria-label="Question ${card.id}">
        <div class="card-brutal-header ${catColors[card.cat]}">
          <span>${cat.name.split(' ').slice(0, 2).join(' ').toUpperCase()}</span>
          <span>${catIcons[card.cat] || ''}</span>
        </div>
        <div class="card-brutal-body">
          <div class="card-brutal-title">${card.q.length > 55 ? card.q.substring(0, 52) + '...' : card.q}</div>
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
  }).join('');

  grid.querySelectorAll('.card-brutal[data-id]').forEach(el => {
    el.addEventListener('click', () => showDetail(parseInt(el.dataset.id)));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(parseInt(el.dataset.id)); }
    });
  });
}

function showDetail(cardId) {
  selectedCardId = cardId;
  const card = FLASHCARDS.find(c => c.id === cardId);
  if (!card) return;

  const mastery = Store.getCardMastery(card.id);
  const cat = CATEGORIES[card.cat];
  const container = document.getElementById('card-detail-container');

  container.innerHTML = `
    <div class="card-detail-overlay" id="detail-overlay">
      <div class="card-detail" role="dialog" aria-label="Card detail for question ${card.id}">
        <div class="card-detail-header">
          <div class="card-detail-header-left">
            <span class="tag">Question ${card.id}</span>
            <span class="card-detail-cat-tag cat-${card.cat}">${cat.name}</span>
          </div>
          <button class="card-detail-close" id="detail-close" aria-label="Close">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <div class="card-detail-body">
          <div class="card-detail-section">
            <div class="card-detail-section-title">Question</div>
            <div class="card-detail-section-content" style="font-family: var(--font-display); font-weight: 800; font-size: 1.1rem; text-transform: uppercase;">${card.q}</div>
          </div>
          <div class="card-detail-section">
            <div class="card-detail-section-title">Answer</div>
            <div class="card-detail-section-content">${card.a}</div>
          </div>
          <div class="card-detail-section">
            <div class="card-detail-section-title">Mastery Progress</div>
            <div style="display: flex; align-items: center; gap: 12px;">
              ${Components.masteryBar(mastery.masteryLevel)}
              <span style="font-weight: 800;">${mastery.masteryLevel}/5</span>
              <span style="margin-left: auto; font-size: 0.75rem; color: var(--gray-400);">
                ${mastery.reviewCount > 0 ? `Reviewed ${mastery.reviewCount}×` : 'Not yet studied'}
              </span>
            </div>
            ${mastery.lastReviewedAt ? `
              <div style="margin-top: 8px; font-size: 0.75rem; color: var(--gray-400);">
                Last: ${new Date(mastery.lastReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            ` : ''}
          </div>
          ${mastery.ratingHistory.length > 0 ? `
            <div class="card-detail-section">
              <div class="card-detail-section-title">Rating History</div>
              <div style="display: flex; gap: 3px; flex-wrap: wrap;">
                ${mastery.ratingHistory.slice(-20).map(r => `
                  <span style="
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 24px; height: 24px; border: 1.5px solid var(--black);
                    font-size: 0.7rem; font-weight: 800;
                    background: ${r.rating >= 4 ? 'var(--green-light)' : r.rating >= 2 ? 'var(--yellow-light)' : 'var(--pink-light)'};
                  ">${r.rating}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button class="btn btn-pink btn-sm" id="detail-study">
              <span class="material-icons-round">play_arrow</span>
              Study This Card
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('detail-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDetail();
  });
  document.getElementById('detail-study').addEventListener('click', () => {
    const s = {
      id: `session_${Date.now()}`, type: 'mock', typeName: `Single Card Q${card.id}`,
      startedAt: Date.now(), completedAt: null, cardIds: [card.id], ratings: {}, score: 0,
    };
    window._activeSession = s;
    closeDetail();
    Router.navigate(`#/study/${s.id}`);
  });

  document.addEventListener('keydown', detailKeyHandler);
}

export function showDetailFromDashboard(cardId) {
  if (!document.getElementById('card-detail-container')) {
    const container = document.createElement('div');
    container.id = 'card-detail-container';
    document.body.appendChild(container);
  }
  showDetail(cardId);
}

function closeDetail() {
  const container = document.getElementById('card-detail-container');
  if (container) container.innerHTML = '';
  selectedCardId = null;
  document.removeEventListener('keydown', detailKeyHandler);
}

function detailKeyHandler(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeDetail(); }
}

function attachEvents() {
  // Category filter (non-search, so immediate)
  document.getElementById('lib-category-filter')?.addEventListener('change', (e) => {
    activeCategories.clear();
    if (e.target.value !== 'all') activeCategories.add(e.target.value);
    renderCards();
  });

  document.getElementById('lib-toggle-mastered')?.addEventListener('click', () => {
    hideMastered = !hideMastered;
    Store.updateSettings({ hideMastered });
    const btn = document.getElementById('lib-toggle-mastered');
    btn.classList.toggle('active', hideMastered);
    btn.querySelector('.material-icons-round').textContent = hideMastered ? 'check_box' : 'check_box_outline_blank';
    renderCards();
  });

  document.getElementById('start-filtered-study')?.addEventListener('click', () => {
    const filtered = getFilteredCards();
    if (filtered.length === 0) { window.__app?.showToast('No cards match your filters!', 'warning'); return; }
    const s = {
      id: `session_${Date.now()}`, type: 'full', typeName: `Custom Study (${filtered.length})`,
      startedAt: Date.now(), completedAt: null, cardIds: filtered.map(c => c.id), ratings: {}, score: 0,
    };
    window._activeSession = s;
    Router.navigate(`#/study/${s.id}`);
  });
}

export function handleKey(e) {
  if (selectedCardId) return;
  switch (e.key) {
    case 'f': case 'F':
      if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); document.getElementById('library-search')?.focus(); } break;
    case 'm': case 'M':
      if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); document.getElementById('lib-toggle-mastered')?.click(); } break;
  }
}

export function cleanupLibrary() {
  destroy$.next();
}

export const LibraryView = { render, handleKey, showDetailFromDashboard };

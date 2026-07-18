/**
 * <civic-library> — Library view with debounced search and card grid
 */
import { fromEvent } from 'rxjs/internal/observable/fromEvent';
import { Subject } from 'rxjs/internal/Subject';
import { debounceTime } from 'rxjs/internal/operators/debounceTime';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { map } from 'rxjs/internal/operators/map';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';

import { FLASHCARDS, CATEGORIES } from '../../data/flashcards';
import { Store } from '../../state/store';
import { SessionManager } from '../../state/session-manager';
import { Router } from '../../router/router';
import type { Flashcard, CategoryId } from '../../types';

import '../shared/card-brutal';
import '../shared/mastery-bar';
import '../shared/card-detail-modal';

export class CivicLibrary extends HTMLElement {
  private activeCategories = new Set<string>();
  private searchQuery = '';
  private hideMastered = false;
  private destroy$ = new Subject<void>();

  connectedCallback() {
    this.hideMastered = Store.getSettings().hideMastered;
    this.render();
    this.setupReactiveSearch();
  }

  disconnectedCallback() {
    this.destroy$.next();
  }

  private setupReactiveSearch() {
    const searchInput = this.querySelector('#library-search') as HTMLInputElement | null;
    if (!searchInput) return;

    fromEvent(searchInput, 'input')
      .pipe(
        map(e => (e.target as HTMLInputElement).value),
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(query => {
        this.searchQuery = query;
        this.renderCards();
      });
  }

  private render() {
    const stats = Store.getMasteryStats();

    this.innerHTML = `
      <div class="library-view">
        <div class="library-header">
          <div class="eyebrow">The Full Deck</div>
          <h1>All 128 Cards</h1>
          <p>Browse and study every USCIS civics question.</p>
          <div class="double-rule"></div>
        </div>

        <div class="filter-bar">
          <div class="search-wrapper">
            <span class="material-icons-round">search</span>
            <input type="text" class="search-input" id="library-search"
                   placeholder="Search questions..." aria-label="Search flashcards"
                   value="${this.searchQuery}">
          </div>
          <select class="filter-select" id="lib-category-filter" aria-label="Filter by category">
            <option value="all">Category: All</option>
            ${(Object.keys(CATEGORIES) as CategoryId[]).map(catId =>
              `<option value="${catId}">${CATEGORIES[catId].name}</option>`
            ).join('')}
          </select>
          <button class="filter-chip ${this.hideMastered ? 'active' : ''}" id="lib-toggle-mastered">
            <span class="material-icons-round">${this.hideMastered ? 'check_box' : 'check_box_outline_blank'}</span>
            Hide Mastered
          </button>
          <button class="btn btn-pink btn-sm" id="start-filtered-study">
            <span class="material-icons-round">play_arrow</span>
            Study Filtered
          </button>
        </div>

        <div class="library-stats">
          <span><span class="library-stat-value" id="lib-showing">${stats.total}</span> showing</span>
          <span class="library-stat-sep">·</span>
          <span><span class="library-stat-value stat-gold">${stats.mastered}</span> mastered</span>
          <span class="library-stat-sep">·</span>
          <span><span class="library-stat-value">${stats.inProgress}</span> in progress</span>
          <span class="library-stat-sep">·</span>
          <span><span class="library-stat-value">${stats.notStarted}</span> not started</span>
        </div>

        <div class="card-grid" id="card-grid"></div>
        <card-detail-modal></card-detail-modal>
      </div>
    `;

    this.renderCards();
    this.attachEvents();
  }

  private getFilteredCards(): Flashcard[] {
    let filtered = [...FLASHCARDS];
    if (this.activeCategories.size > 0) {
      filtered = filtered.filter(c => this.activeCategories.has(c.cat));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.q.toLowerCase().includes(q) ||
        c.answers.some(a => a.toLowerCase().includes(q)) ||
        (c.why ?? '').toLowerCase().includes(q) ||
        (c.note ?? '').toLowerCase().includes(q) ||
        CATEGORIES[c.cat].name.toLowerCase().includes(q)
      );
    }
    if (this.hideMastered) {
      filtered = filtered.filter(c => !Store.isCardMastered(c.id));
    }
    return filtered;
  }

  private renderCards() {
    const grid = this.querySelector('#card-grid');
    if (!grid) return;

    const filtered = this.getFilteredCards();
    const showingEl = this.querySelector('#lib-showing');
    if (showingEl) showingEl.textContent = String(filtered.length);

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state"><span class="material-icons-round">search_off</span><p>No cards match your filters.</p></div>`;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(card => {
      const el = document.createElement('card-brutal') as InstanceType<typeof import('../shared/card-brutal').CardBrutal>;
      el.className = 'card-brutal';
      el.card = card;
      grid.appendChild(el);
    });
  }

  handleKey(e: KeyboardEvent) {
    switch (e.key) {
      case 'f': case 'F':
        if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); (this.querySelector('#library-search') as HTMLInputElement)?.focus(); } break;
      case 'm': case 'M':
        if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); this.querySelector<HTMLButtonElement>('#lib-toggle-mastered')?.click(); } break;
    }
  }

  private attachEvents() {
    // Card clicks → modal
    this.addEventListener('card-click', ((e: CustomEvent) => {
      const modal = this.querySelector('card-detail-modal') as InstanceType<typeof import('../shared/card-detail-modal').CardDetailModal> | null;
      if (modal) modal.cardId = e.detail.cardId;
    }) as EventListener);

    // Modal study-card → launch session
    this.addEventListener('study-card', ((e: CustomEvent) => {
      const s = {
        id: `session_${Date.now()}`, type: 'full' as const, typeName: `Single Card Q${e.detail.cardId}`,
        startedAt: Date.now(), completedAt: null, cardIds: [e.detail.cardId], ratings: {}, score: 0,
      };
      SessionManager.set(s);
      Router.navigate(`#/study/${s.id}`);
    }) as EventListener);

    this.querySelector('#lib-category-filter')?.addEventListener('change', (e) => {
      this.activeCategories.clear();
      const val = (e.target as HTMLSelectElement).value;
      if (val !== 'all') this.activeCategories.add(val);
      this.renderCards();
    });

    this.querySelector('#lib-toggle-mastered')?.addEventListener('click', () => {
      this.hideMastered = !this.hideMastered;
      Store.updateSettings({ hideMastered: this.hideMastered });
      const btn = this.querySelector('#lib-toggle-mastered')!;
      btn.classList.toggle('active', this.hideMastered);
      btn.querySelector('.material-icons-round')!.textContent = this.hideMastered ? 'check_box' : 'check_box_outline_blank';
      this.renderCards();
    });

    this.querySelector('#start-filtered-study')?.addEventListener('click', () => {
      const filtered = this.getFilteredCards();
      if (filtered.length === 0) { import('../shared/civic-toast').then(m => m.showToast('No cards match your filters!', 'warning')); return; }
      const s = {
        id: `session_${Date.now()}`, type: 'full' as const, typeName: `Custom Study (${filtered.length})`,
        startedAt: Date.now(), completedAt: null, cardIds: filtered.map(c => c.id), ratings: {}, score: 0,
      };
      SessionManager.set(s);
      Router.navigate(`#/study/${s.id}`);
    });
  }
}

customElements.define('civic-library', CivicLibrary);

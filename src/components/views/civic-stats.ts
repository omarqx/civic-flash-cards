/**
 * <civic-stats> — Statistics overview
 */
import { CATEGORIES } from '../../data/flashcards';
import { Store } from '../../state/store';
import { CAT_COLORS } from '../../data/flashcards';
import type { CategoryId } from '../../types';

export class CivicStats extends HTMLElement {
  connectedCallback() { this.render(); }

  private render() {
    const stats = Store.getMasteryStats();
    const sessions = Store.getSessions();
    const catStats = Store.getCategoryStats();
    const badgeColors: Record<string, string> = { mock: 'cat-D', daily: 'cat-A', weekly: 'cat-B', monthly: 'cat-E', full: 'cat-G' };

    const catRows = (Object.keys(CATEGORIES) as CategoryId[]).map(catId => {
      const cat = CATEGORIES[catId];
      const s = catStats[catId];
      return `
        <div class="category-row">
          <span class="category-row-label">${cat.name}</span>
          <div class="category-row-bar">
            <div class="category-row-fill" style="width: ${s.percent}%; background: ${CAT_COLORS[catId]}"></div>
          </div>
          <span class="category-row-pct">${s.percent}%</span>
        </div>
      `;
    }).join('');

    this.innerHTML = `
      <div class="stats-view">
        <div class="stats-view-header">
          <div class="eyebrow">The Record</div>
          <h1>Statistics</h1>
          <p>Track your progress toward mastering all 128 civics questions.</p>
          <div class="double-rule"></div>
        </div>

        <div class="stats-grid-4">
          <div class="stat-block"><span class="stat-block-num">${stats.mastered}</span><span class="stat-block-label">Mastered</span></div>
          <div class="stat-block"><span class="stat-block-num">${stats.inProgress}</span><span class="stat-block-label">In Progress</span></div>
          <div class="stat-block"><span class="stat-block-num">${stats.notStarted}</span><span class="stat-block-label">Not Started</span></div>
          <div class="stat-block"><span class="stat-block-num">${sessions.length}</span><span class="stat-block-label">Sessions</span></div>
        </div>

        <div class="section-head"><h2>Category Mastery</h2></div>
        <div class="category-panel">${catRows}</div>

        <div class="section-head"><h2>All Sessions</h2></div>
        ${sessions.length === 0
          ? '<div class="empty-state"><span class="material-icons-round">history</span><p>No sessions yet.</p></div>'
          : `<div class="history-list" role="list">${sessions.map(s => {
              const date = new Date(s.startedAt);
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const reviewed = Object.keys(s.ratings).length;
              return `
                <div class="history-item" tabindex="0" role="listitem">
                  <span class="history-item-badge ${badgeColors[s.type] || 'cat-A'}">${s.typeName}</span>
                  <div class="history-item-info"><div class="history-item-date">${dateStr} · ${timeStr} · ${reviewed}/${s.cardIds.length} cards</div></div>
                  <div class="history-item-score">${s.score.toFixed(1)}</div>
                </div>
              `;
            }).join('')}</div>`}
      </div>
    `;
  }
}

customElements.define('civic-stats', CivicStats);

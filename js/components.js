/**
 * Components — Shared UI renderers (ES module)
 */
import { CATEGORIES, SESSION_TYPES } from './data.js';
import { Store } from './store.js';

export function masteryBar(level) {
  const colors = ['filled-green', 'filled-green', 'filled-teal', 'filled-yellow', 'filled-pink'];
  let segs = '';
  for (let i = 0; i < 5; i++) {
    segs += `<span class="mastery-seg ${i < level ? colors[Math.min(i, colors.length - 1)] : ''}"></span>`;
  }
  return `<div class="mastery-bar" aria-label="Mastery level ${level} of 5">${segs}</div>`;
}

export function categoryTag(catId) {
  const cat = CATEGORIES[catId];
  if (!cat) return '';
  return `<span class="card-detail-cat-tag cat-${catId}">${cat.name.split(' ').slice(0, 2).join(' ')}</span>`;
}

export function statRow(label, value, colorClass = '') {
  return `
    <div class="stat-row ${colorClass}">
      <span class="stat-row-label">${label}</span>
      <span class="stat-row-value">${value}</span>
    </div>
  `;
}

export function statColored(icon, value, label, bgClass) {
  return `
    <div class="stat-colored ${bgClass}">
      <span class="material-icons-round">${icon}</span>
      <span>${value}</span>
      <span class="stat-colored-label">${label}</span>
    </div>
  `;
}

export function historyItem(session) {
  const type = SESSION_TYPES[session.type];
  const date = new Date(session.startedAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const typeName = session.typeName || (type ? type.name : 'Study');
  const reviewed = Object.keys(session.ratings).length;
  const total = session.cardIds.length;
  const badgeColors = { mock: 'cat-D', daily: 'cat-A', weekly: 'cat-B', monthly: 'cat-E', full: 'cat-G' };

  return `
    <div class="history-item" tabindex="0" role="listitem">
      <span class="history-item-badge ${badgeColors[session.type] || 'cat-A'}">${typeName}</span>
      <div class="history-item-info">
        <div class="history-item-date">${dateStr} · ${timeStr} · ${reviewed}/${total} cards</div>
      </div>
      <div class="history-item-score">${session.score.toFixed(1)}</div>
    </div>
  `;
}

export function emptyState(icon, message) {
  return `
    <div class="empty-state">
      <span class="material-icons-round">${icon}</span>
      <p>${message}</p>
    </div>
  `;
}

export function categoryProgress() {
  const stats = Store.getCategoryStats();
  const catColors = { A: 'var(--pink)', B: 'var(--teal)', C: 'var(--blue)', D: 'var(--magenta)', E: 'var(--yellow)', F: 'var(--orange)', G: 'var(--green)', H: '#93C5FD' };
  let rows = '';

  Object.keys(CATEGORIES).forEach(catId => {
    const cat = CATEGORIES[catId];
    const s = stats[catId];
    rows += `
      <div class="category-row">
        <span class="category-row-label">${cat.name}</span>
        <div class="category-row-bar">
          <div class="category-row-fill" style="width: ${s.percent}%; background: ${catColors[catId]}"></div>
        </div>
        <span class="category-row-pct">${s.percent}%</span>
      </div>
    `;
  });

  return `<div>${rows}</div>`;
}

export function trendChart() {
  const sessions = Store.getSessions().slice(0, 10).reverse();
  if (sessions.length === 0) {
    return '<div style="color: var(--gray-400); font-size: 0.75rem; text-align: center; padding: 16px 0;">No data yet</div>';
  }
  const maxScore = 5;
  const bars = sessions.map((s, i) => {
    const h = Math.max(8, (s.score / maxScore) * 60);
    const isLast = i === sessions.length - 1;
    return `<div class="trend-bar ${isLast ? 'highlight' : ''}" style="height: ${h}px" title="Score: ${s.score.toFixed(1)}"></div>`;
  }).join('');

  return `<div class="trend-bars">${bars}</div>`;
}

/**
 * <trend-chart> — Mini bar chart of recent session scores
 */
import { Store } from '../../state/store';

export class TrendChart extends HTMLElement {
  connectedCallback() { this.render(); }

  refresh() { this.render(); }

  private render() {
    const sessions = Store.getSessions().slice(0, 10).reverse();
    if (sessions.length === 0) {
      this.innerHTML = '<div style="color: var(--gray-400); font-size: 0.75rem; text-align: center; padding: 16px 0;">No data yet</div>';
      return;
    }

    const maxScore = 5;
    const bars = sessions.map((s, i) => {
      const h = Math.max(8, (s.score / maxScore) * 60);
      const isLast = i === sessions.length - 1;
      return `<div class="trend-bar ${isLast ? 'highlight' : ''}" style="height: ${h}px" title="Score: ${s.score.toFixed(1)}"></div>`;
    }).join('');

    this.innerHTML = `<div class="trend-bars">${bars}</div>`;
  }
}

customElements.define('trend-chart', TrendChart);

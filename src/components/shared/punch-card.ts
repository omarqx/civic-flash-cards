/**
 * <punch-card> — prep punch-card grid: one cell per prep day.
 * ★ = quota met · dot = missed · outlined = today · ⚑ = interview day.
 */
import { Store } from '../../state/store';
import { todayISO, daysBetween, addDaysISO } from '../../utils/dates';

const WINDOW = 42; // show at most the trailing 6 weeks

export class PunchCard extends HTMLElement {
  connectedCallback() { this.render(); }

  private render() {
    const s = Store.getSettings();
    const log = Store.getPunchLog();
    const today = todayISO();
    if (!s.interviewDate || !s.prepStartDate || daysBetween(today, s.interviewDate) < 0) {
      this.innerHTML = '';
      return;
    }

    const totalDays = daysBetween(s.prepStartDate, s.interviewDate) + 1; // inclusive of interview day
    const clipped = Math.max(0, totalDays - WINDOW);
    const start = clipped > 0 ? addDaysISO(s.prepStartDate, clipped) : s.prepStartDate;
    const shown = totalDays - clipped;

    let cells = '';
    for (let i = 0; i < shown; i++) {
      const day = addDaysISO(start, i);
      const entry = log[day];
      const punched = !!entry && (entry.quota === 0 || entry.mastered >= entry.quota);
      const isToday = day === today;
      const isInterview = day === s.interviewDate;
      const isPast = daysBetween(day, today) > 0;
      const cls = ['punch-cell'];
      if (punched) cls.push('punched');
      if (isToday) cls.push('today');
      if (isInterview) cls.push('interview');
      if (!punched && isPast && !isInterview) cls.push('missed');
      const glyph = isInterview ? '⚑' : punched ? '★' : isPast ? '·' : '';
      cells += `<span class="${cls.join(' ')}" title="${day}">${glyph}</span>`;
    }

    this.innerHTML = `
      <div class="sidebar-box punch-box">
        <div class="sidebar-box-header">Prep Punch Card</div>
        ${clipped > 0 ? `<div class="punch-clip-note">+${clipped} earlier days</div>` : ''}
        <div class="punch-grid">${cells}</div>
      </div>
    `;
  }
}

customElements.define('punch-card', PunchCard);

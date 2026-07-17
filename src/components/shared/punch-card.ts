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
    const todayInTrailingWindow = daysBetween(today, s.interviewDate) <= WINDOW - 1;
    let start: string;
    let shown: number;
    let clipNote: number;
    if (clipped === 0) {
      start = s.prepStartDate;
      shown = totalDays;
      clipNote = 0;
    } else if (todayInTrailingWindow) {
      start = addDaysISO(s.prepStartDate, clipped);
      shown = totalDays - clipped;
      clipNote = clipped;
    } else {
      // Long runway: window starts at today so today's cell is always visible.
      // The ⚑ interview cell falls outside this window — accepted tradeoff.
      start = today;
      shown = WINDOW;
      clipNote = daysBetween(s.prepStartDate, today);
    }

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
        ${clipNote > 0 ? `<div class="punch-clip-note">+${clipNote} earlier days</div>` : ''}
        <div class="punch-grid">${cells}</div>
      </div>
    `;
  }
}

customElements.define('punch-card', PunchCard);

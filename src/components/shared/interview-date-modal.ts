/**
 * <interview-date-modal> — first-visit / expiry prompt for the interview date.
 * open(expired) shows the dialog; Escape/backdrop/skip = default 30-day plan.
 * Self-removes after any choice.
 */
import { Store } from '../../state/store';
import { todayISO, addDaysISO } from '../../utils/dates';

export class InterviewDateModal extends HTMLElement {
  open(expired: boolean) {
    const minDate = addDaysISO(todayISO(), 1);
    const defaultDate = addDaysISO(todayISO(), 30);
    this.innerHTML = `
      <dialog class="modal interview-modal" aria-label="Set your interview date">
        <div class="interview-modal-body">
          <div class="eyebrow">${expired ? 'A New Chapter' : 'Welcome, Future Citizen'}</div>
          <h2>${expired ? 'Your interview date has passed — set your next target.' : 'When is your naturalization interview?'}</h2>
          <p>We'll pace your studying so every question is mastered before the big day.</p>
          <input type="date" class="interview-date-input" min="${minDate}" value="${defaultDate}" aria-label="Interview date">
          <div class="interview-modal-actions">
            <button class="btn btn-navy" data-action="set">Set my date</button>
            <button class="btn btn-quiet" data-action="skip">Skip — plan 1 month for me</button>
          </div>
        </div>
      </dialog>
    `;

    const dialog = this.querySelector('dialog')!;
    const input = this.querySelector<HTMLInputElement>('.interview-date-input')!;

    const finish = (dateISO: string, isDefault: boolean) => {
      Store.setInterviewDate(dateISO, isDefault);
      dialog.close();
      this.remove();
    };
    const skip = () => finish(addDaysISO(todayISO(), 30), true);

    this.querySelector('[data-action="set"]')?.addEventListener('click', () => {
      const v = input.value;
      if (v && v >= minDate) finish(v, false); else skip();
    });
    this.querySelector('[data-action="skip"]')?.addEventListener('click', skip);
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); skip(); });          // Escape
    dialog.addEventListener('click', (e) => { if (e.target === dialog) skip(); });      // backdrop

    dialog.showModal();
  }
}

customElements.define('interview-date-modal', InterviewDateModal);

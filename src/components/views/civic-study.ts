/**
 * <civic-study> — Study mode with flashcard, rating, and RxJS timer
 */
import { interval } from 'rxjs/internal/observable/interval';
import { Subject } from 'rxjs/internal/Subject';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import type { Subscription } from 'rxjs/internal/Subscription';

import { FLASHCARDS, CATEGORIES, SESSION_TYPES, STUDY_TIPS } from '../../data/flashcards';
import { Store } from '../../state/store';
import { SessionManager } from '../../state/session-manager';
import { Router } from '../../router/router';
import { showToast } from '../shared/civic-toast';
import type { Flashcard, StudySession } from '../../types';

import '../shared/flash-card';
import '../shared/rating-bar';
import '../shared/stat-colored';
import '../shared/mastery-bar';

export class CivicStudy extends HTMLElement {
  private session: StudySession | null = null;
  private cards: Flashcard[] = [];
  private currentIndex = 0;
  private isFlipped = false;
  private timerSub: Subscription | null = null;
  private timerSeconds = 0;
  private streak = 0;
  private sessionCompleted = false;
  private destroy$ = new Subject<void>();

  connectedCallback() {
    this.session = SessionManager.get();
    if (!this.session) { Router.navigate('#/dashboard'); return; }

    this.cards = this.session.cardIds
      .map(id => FLASHCARDS.find(c => c.id === id))
      .filter((c): c is Flashcard => c !== undefined);
    this.currentIndex = 0;
    this.isFlipped = false;
    this.sessionCompleted = false;
    this.streak = 0;
    this.timerSeconds = 0;

    this.render();
    this.renderCard();
    this.startTimer();
  }

  disconnectedCallback() {
    this.destroy$.next();
    this.timerSub?.unsubscribe();
  }

  private render() {
    const reviewed = this.session ? Object.keys(this.session.ratings).length : 0;
    const total = this.cards.length;
    const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    this.innerHTML = `
      <div class="study-view" id="study-view">
        <div class="study-main">
          <div class="session-progress-bar">
            <div class="session-progress-ring" id="progress-ring">${pct}%</div>
            <div class="session-progress-text">
              <span class="session-progress-title">Session Progress</span>
              <span class="session-progress-sub" id="progress-sub">You've reviewed ${reviewed} of ${total} cards.</span>
            </div>
          </div>

          <div id="flashcard-container"></div>

          <div class="study-actions">
            <button class="btn-nav-arrow" id="card-prev" aria-label="Previous card">
              <span class="material-icons-round">chevron_left</span>
            </button>
            <button class="btn-still-learning" id="btn-still-learning" aria-label="Still Learning">
              <span>Still Learning</span>
              <span class="sub">I'll see this again soon</span>
            </button>
            <button class="btn-i-know-this" id="btn-i-know-this" aria-label="I Know This">
              <span>I Know This</span>
              <span class="sub">Add to mastered deck</span>
            </button>
            <button class="btn-nav-arrow" id="card-next" aria-label="Next card">
              <span class="material-icons-round">chevron_right</span>
            </button>
          </div>

          <rating-bar id="rating-bar"></rating-bar>
        </div>

        <div class="study-sidebar">
          <div class="sidebar-box">
            <div class="sidebar-box-header">Session Statistics</div>
            <div class="sidebar-box-body">
              <div class="stat-row"><span class="stat-row-label">Mastered</span><span class="stat-row-value" id="stat-mastered" style="color: var(--green-dark)">0</span></div>
              <div class="stat-row"><span class="stat-row-label">Struggling</span><span class="stat-row-value" id="stat-struggling" style="color: var(--pink)">0</span></div>
              <div class="stat-row"><span class="stat-row-label">Accuracy</span><span class="stat-row-value" id="stat-accuracy">0%</span></div>
              <div class="stat-row"><span class="stat-row-label">Avg Time</span><span class="stat-row-value" id="stat-time">0.0s</span></div>
            </div>
          </div>
          <div class="streak-box">
            <div class="streak-box-label">Current Streak</div>
            <div class="streak-box-value">
              <span class="material-icons-round">local_fire_department</span>
              <span id="stat-streak">0 Cards</span>
            </div>
          </div>
          <div class="study-tip">
            <div class="study-tip-header">
              <span class="material-icons-round">lightbulb</span>
              Pro Study Tip
            </div>
            <p>${STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]}</p>
          </div>
        </div>

        <div id="session-complete" style="display:none;"></div>
      </div>
    `;

    this.attachEvents();
  }

  private renderCard() {
    const container = this.querySelector('#flashcard-container');
    if (!container || this.cards.length === 0) return;

    const card = this.cards[this.currentIndex];
    if (!card) return;

    this.isFlipped = false;
    container.innerHTML = '';
    const fc = document.createElement('flash-card') as InstanceType<typeof import('../shared/flash-card').FlashCard>;
    fc.card = card;
    fc.flipped = false;
    container.appendChild(fc);

    const ratingBar = this.querySelector('#rating-bar');
    ratingBar?.removeAttribute('visible');

    this.updateProgress();
  }

  private flipCard() {
    if (this.cards.length === 0) return;
    this.isFlipped = !this.isFlipped;
    const fc = this.querySelector('flash-card') as InstanceType<typeof import('../shared/flash-card').FlashCard> | null;
    if (fc) fc.flipped = this.isFlipped;

    const ratingBar = this.querySelector('#rating-bar');
    if (this.isFlipped) {
      ratingBar?.setAttribute('visible', '');
    } else {
      ratingBar?.removeAttribute('visible');
    }
  }

  private rateCard(rating: number) {
    if (this.cards.length === 0 || this.sessionCompleted || !this.session) return;

    const card = this.cards[this.currentIndex];
    Store.setCardRating(card.id, rating);
    this.session.ratings[card.id] = rating;

    if (rating >= 4) { this.streak++; } else { this.streak = 0; }

    showToast(
      rating >= 4 ? 'Great job! Moving on...' : rating >= 2 ? 'Keep practicing!' : "Don't worry, you'll get it!",
      rating >= 4 ? 'success' : 'info'
    );

    this.updateStats();

    setTimeout(() => {
      if (this.currentIndex < this.cards.length - 1) {
        this.currentIndex++;
        this.renderCard();
      } else {
        this.completeSession();
      }
    }, 400);
  }

  private updateProgress() {
    if (!this.session) return;
    const reviewed = Object.keys(this.session.ratings).length;
    const total = this.session.cardIds.length;
    const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
    const ring = this.querySelector('#progress-ring');
    if (ring) ring.textContent = `${pct}%`;
    const sub = this.querySelector('#progress-sub');
    if (sub) sub.textContent = `You've reviewed ${reviewed} of ${total} cards.`;
  }

  private updateStats() {
    if (!this.session) return;
    const ratings = Object.values(this.session.ratings);
    const mastered = ratings.filter(r => r >= 4).length;
    const struggling = ratings.filter(r => r < 3).length;
    const accuracy = ratings.length > 0 ? Math.round((mastered / ratings.length) * 100) : 0;
    const avgTime = ratings.length > 0 ? (this.timerSeconds / ratings.length).toFixed(1) : '0.0';

    const el = (id: string) => this.querySelector(`#${id}`);
    const e1 = el('stat-mastered'); if (e1) e1.textContent = String(mastered);
    const e2 = el('stat-struggling'); if (e2) e2.textContent = String(struggling);
    const e3 = el('stat-accuracy'); if (e3) e3.textContent = `${accuracy}%`;
    const e4 = el('stat-time'); if (e4) e4.textContent = `${avgTime}s`;
    const e5 = el('stat-streak'); if (e5) e5.textContent = `${this.streak} Cards`;

    this.updateProgress();
  }

  private startTimer() {
    this.timerSeconds = 0;
    this.timerSub?.unsubscribe();
    this.timerSub = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.timerSeconds++; });
  }

  private completeSession() {
    if (!this.session) return;
    this.sessionCompleted = true;
    this.timerSub?.unsubscribe();

    const saved = Store.saveSession(this.session);
    SessionManager.clear();

    const ratings = Object.values(saved.ratings);
    const mastered = ratings.filter(r => r >= 4).length;

    const completeEl = this.querySelector('#session-complete') as HTMLElement | null;
    if (completeEl) {
      completeEl.style.display = 'block';
      completeEl.innerHTML = `
        <div class="card-detail-overlay" id="complete-overlay">
          <div class="card-detail" style="text-align: center;">
            <div class="card-detail-body" style="padding: 40px;">
              <div style="font-size: 3rem; margin-bottom: 12px;">🏆</div>
              <div style="font-family: var(--font-display); font-weight: 800; font-size: 1.5rem; text-transform: uppercase; margin-bottom: 8px;">Session Complete!</div>
              <p style="margin-bottom: 24px; color: var(--gray-500);">
                You reviewed ${ratings.length} cards with an average score of ${saved.score.toFixed(1)}/5.
              </p>
              <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px;">
                <stat-colored icon="check_circle" value="${mastered}" label="Mastered" variant="stat-green"></stat-colored>
                <stat-colored icon="trending_up" value="${ratings.length - mastered}" label="Learning" variant="stat-pink"></stat-colored>
              </div>
              <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-yellow" id="complete-dashboard">Back to Dashboard</button>
                <button class="btn btn-white" id="complete-retry">Study Again</button>
              </div>
            </div>
          </div>
        </div>
      `;

      completeEl.querySelector('#complete-dashboard')?.addEventListener('click', () => Router.navigate('#/dashboard'));
      completeEl.querySelector('#complete-retry')?.addEventListener('click', () => {
        const newSession = Store.createSession(saved.type);
        if (newSession) { SessionManager.set(newSession); this.connectedCallback(); }
      });
      completeEl.querySelector('#complete-overlay')?.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).id === 'complete-overlay') Router.navigate('#/dashboard');
      });
    }
  }

  handleKey(e: KeyboardEvent) {
    if (this.sessionCompleted) return;
    switch (e.key) {
      case ' ': case 'Enter':
        if ((document.activeElement as HTMLElement)?.classList?.contains('rating-btn')) return;
        e.preventDefault(); this.flipCard(); break;
      case 'ArrowLeft': e.preventDefault(); this.goPrev(); break;
      case 'ArrowRight': e.preventDefault(); this.goNext(); break;
      case '0': case '1': case '2': case '3': case '4': case '5':
        if (this.isFlipped) { e.preventDefault(); this.rateCard(parseInt(e.key)); } break;
      case 'Escape':
        if (this.session && Object.keys(this.session.ratings).length > 0) Store.saveSession(this.session);
        SessionManager.clear();
        this.destroy$.next();
        this.timerSub?.unsubscribe();
        Router.navigate('#/dashboard'); break;
    }
  }

  private goNext() { if (this.currentIndex < this.cards.length - 1) { this.currentIndex++; this.renderCard(); } }
  private goPrev() { if (this.currentIndex > 0) { this.currentIndex--; this.renderCard(); } }

  private attachEvents() {
    this.addEventListener('flip', () => this.flipCard());

    this.addEventListener('rate', ((e: CustomEvent) => {
      this.rateCard(e.detail.rating);
    }) as EventListener);

    this.querySelector('#btn-still-learning')?.addEventListener('click', () => {
      if (this.isFlipped) this.rateCard(2); else this.flipCard();
    });
    this.querySelector('#btn-i-know-this')?.addEventListener('click', () => {
      if (this.isFlipped) this.rateCard(5); else this.flipCard();
    });
    this.querySelector('#card-prev')?.addEventListener('click', () => this.goPrev());
    this.querySelector('#card-next')?.addEventListener('click', () => this.goNext());
  }
}

customElements.define('civic-study', CivicStudy);

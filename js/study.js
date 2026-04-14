/**
 * Study Mode — ES module with RxJS state machine
 *
 * Uses scan() to model card state, interval() for timer,
 * and Subject for action dispatching.
 */
import { Subject, interval, merge } from 'rxjs';
import { scan, distinctUntilChanged, map, takeUntil, startWith } from 'rxjs/operators';
import { FLASHCARDS, CATEGORIES, SESSION_TYPES, STUDY_TIPS } from './data.js';
import { Store } from './store.js';
import * as Components from './components.js';
import { Router } from './router.js';

// ── RxJS Action stream ──
const action$ = new Subject();
const destroy$ = new Subject();

// ── State ──
let session = null;
let cards = [];
let currentIndex = 0;
let isFlipped = false;
let timerSub = null;
let timerSeconds = 0;
let streak = 0;
let sessionCompleted = false;

export function render(params) {
  const main = document.getElementById('main-content');

  // Cleanup previous subscriptions
  destroy$.next();

  session = window._activeSession || null;
  if (!session) {
    Router.navigate('#/dashboard');
    return;
  }

  cards = session.cardIds.map(id => FLASHCARDS.find(c => c.id === id)).filter(Boolean);
  currentIndex = 0;
  isFlipped = false;
  sessionCompleted = false;
  streak = 0;
  timerSeconds = 0;

  main.innerHTML = buildLayout();
  attachEvents();
  renderCard();
  startTimer();
}

function buildLayout() {
  const type = SESSION_TYPES[session.type];
  const reviewed = Object.keys(session.ratings).length;
  const total = cards.length;
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return `
    <div class="study-view" id="study-view">
      <div class="study-main">
        <!-- Session Progress -->
        <div class="session-progress-bar">
          <div class="session-progress-ring" id="progress-ring">${pct}%</div>
          <div class="session-progress-text">
            <span class="session-progress-title">Session Progress</span>
            <span class="session-progress-sub" id="progress-sub">You've reviewed ${reviewed} of ${total} cards.</span>
          </div>
        </div>

        <!-- Flashcard -->
        <div class="flashcard-scene" id="flashcard-scene">
          <div class="flashcard" id="flashcard" tabindex="0" role="button"
               aria-label="Press Space to flip card">
            <div class="flashcard-face front" id="flashcard-front"></div>
            <div class="flashcard-face back" id="flashcard-back"></div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="study-actions" id="study-actions">
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

        <!-- Rating section (shown after flip) -->
        <div class="rating-section" id="rating-section">
          <div class="rating-label">Rate your confidence (0–5)</div>
          <div class="rating-buttons">
            <button class="rating-btn" data-rating="0"><span class="rating-btn-number">0</span><span>No Idea</span></button>
            <button class="rating-btn" data-rating="1"><span class="rating-btn-number">1</span><span>Wrong</span></button>
            <button class="rating-btn" data-rating="2"><span class="rating-btn-number">2</span><span>Partial</span></button>
            <button class="rating-btn" data-rating="3"><span class="rating-btn-number">3</span><span>Close</span></button>
            <button class="rating-btn" data-rating="4"><span class="rating-btn-number">4</span><span>Got It</span></button>
            <button class="rating-btn" data-rating="5"><span class="rating-btn-number">5</span><span>Perfect</span></button>
          </div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <div class="study-sidebar">
        <!-- Session Statistics -->
        <div class="sidebar-box">
          <div class="sidebar-box-header">Session Statistics</div>
          <div class="sidebar-box-body">
            ${Components.statRow('Mastered', '<span id="stat-mastered" style="color: var(--green-dark)">0</span>')}
            ${Components.statRow('Struggling', '<span id="stat-struggling" style="color: var(--pink)">0</span>')}
            ${Components.statRow('Accuracy', '<span id="stat-accuracy">0%</span>')}
            ${Components.statRow('Avg Time', '<span id="stat-time">0.0s</span>')}
          </div>
        </div>

        <!-- Current Streak -->
        <div class="streak-box">
          <div class="streak-box-label">Current Streak</div>
          <div class="streak-box-value">
            <span class="material-icons-round">local_fire_department</span>
            <span id="stat-streak">0 Cards</span>
          </div>
        </div>

        <!-- Pro Study Tip -->
        <div class="study-tip">
          <div class="study-tip-header">
            <span class="material-icons-round">lightbulb</span>
            Pro Study Tip
          </div>
          <p>${STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]}</p>
        </div>
      </div>

      <!-- Session Complete overlay -->
      <div id="session-complete" style="display:none;"></div>
    </div>
  `;
}

function renderCard() {
  if (cards.length === 0) {
    document.getElementById('flashcard-front').innerHTML = `
      <span class="material-icons-round" style="font-size: 3rem; color: var(--green); margin-bottom: 16px;">check_circle</span>
      <div class="flashcard-question">All Done!</div>
      <div class="flashcard-hint">
        <span class="material-icons-round">arrow_back</span>
        Go back to dashboard
      </div>
    `;
    return;
  }

  const card = cards[currentIndex];
  if (!card) return;

  const cat = CATEGORIES[card.cat];

  isFlipped = false;
  const flashcardEl = document.getElementById('flashcard');
  flashcardEl.classList.remove('flipped');

  document.getElementById('flashcard-front').innerHTML = `
    <span class="flashcard-cat-tag cat-${card.cat}">${cat ? cat.name.split(' ').slice(0, 2).join(' ').toUpperCase() : ''}</span>
    <span class="flashcard-number">Q${card.id}</span>
    <div class="flashcard-question">${card.q}</div>
    <div class="flashcard-hint">
      <span>◆</span>
      Click or press Space to reveal
    </div>
  `;

  document.getElementById('flashcard-back').innerHTML = `
    <span class="flashcard-cat-tag cat-${card.cat}">${cat ? cat.name.split(' ').slice(0, 2).join(' ').toUpperCase() : ''}</span>
    <span class="flashcard-number">Q${card.id}</span>
    <div class="flashcard-answer-label">Answer</div>
    <div class="flashcard-answer">${card.a}</div>
  `;

  document.getElementById('rating-section').classList.remove('visible');
  updateProgress();
}

function flipCard() {
  if (cards.length === 0) return;
  isFlipped = !isFlipped;
  document.getElementById('flashcard').classList.toggle('flipped', isFlipped);

  if (isFlipped) {
    document.getElementById('rating-section').classList.add('visible');
  } else {
    document.getElementById('rating-section').classList.remove('visible');
  }
}

function rateCard(rating) {
  if (cards.length === 0 || sessionCompleted) return;

  const card = cards[currentIndex];
  Store.setCardRating(card.id, rating); // This pushes via BehaviorSubject
  session.ratings[card.id] = rating;

  if (rating >= 4) { streak++; } else { streak = 0; }

  window.__app?.showToast(
    rating >= 4 ? 'Great job! Moving on...' : rating >= 2 ? 'Keep practicing!' : "Don't worry, you'll get it!",
    rating >= 4 ? 'success' : 'info'
  );

  updateStats();

  setTimeout(() => {
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      renderCard();
    } else {
      completeSession();
    }
  }, 400);
}

function handleStillLearning() {
  if (isFlipped) { rateCard(2); } else { flipCard(); }
}

function handleIKnowThis() {
  if (isFlipped) { rateCard(5); } else { flipCard(); }
}

function goNext() { if (currentIndex < cards.length - 1) { currentIndex++; renderCard(); } }
function goPrev() { if (currentIndex > 0) { currentIndex--; renderCard(); } }

function updateProgress() {
  const reviewed = Object.keys(session.ratings).length;
  const total = session.cardIds.length;
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  const ring = document.getElementById('progress-ring');
  if (ring) ring.textContent = `${pct}%`;
  const sub = document.getElementById('progress-sub');
  if (sub) sub.textContent = `You've reviewed ${reviewed} of ${total} cards.`;
}

function updateStats() {
  const ratings = Object.values(session.ratings);
  const mastered = ratings.filter(r => r >= 4).length;
  const struggling = ratings.filter(r => r < 3).length;
  const accuracy = ratings.length > 0 ? Math.round((mastered / ratings.length) * 100) : 0;
  const avgTime = ratings.length > 0 ? (timerSeconds / ratings.length).toFixed(1) : '0.0';

  const el1 = document.getElementById('stat-mastered'); if (el1) el1.textContent = mastered;
  const el2 = document.getElementById('stat-struggling'); if (el2) el2.textContent = struggling;
  const el3 = document.getElementById('stat-accuracy'); if (el3) el3.textContent = `${accuracy}%`;
  const el4 = document.getElementById('stat-time'); if (el4) el4.textContent = `${avgTime}s`;
  const el5 = document.getElementById('stat-streak'); if (el5) el5.textContent = `${streak} Cards`;

  updateProgress();
}

function startTimer() {
  // Use RxJS interval for the study timer
  timerSeconds = 0;
  if (timerSub) timerSub.unsubscribe();

  timerSub = interval(1000)
    .pipe(takeUntil(destroy$))
    .subscribe(() => { timerSeconds++; });
}

function completeSession() {
  sessionCompleted = true;
  if (timerSub) timerSub.unsubscribe();

  const saved = Store.saveSession(session);
  window._activeSession = null;

  const ratings = Object.values(saved.ratings);
  const mastered = ratings.filter(r => r >= 4).length;

  const completeEl = document.getElementById('session-complete');
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
              ${Components.statColored('check_circle', mastered, 'Mastered', 'stat-green')}
              ${Components.statColored('trending_up', ratings.length - mastered, 'Learning', 'stat-pink')}
            </div>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-yellow" id="complete-dashboard">Back to Dashboard</button>
              <button class="btn btn-white" id="complete-retry">Study Again</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('complete-dashboard').addEventListener('click', () => Router.navigate('#/dashboard'));
    document.getElementById('complete-retry').addEventListener('click', () => {
      const newSession = Store.createSession(session.type);
      window._activeSession = newSession;
      render({ sessionId: newSession.id });
    });
    document.getElementById('complete-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) Router.navigate('#/dashboard');
    });
  }
}

function attachEvents() {
  document.getElementById('flashcard').addEventListener('click', flipCard);
  document.getElementById('btn-still-learning').addEventListener('click', handleStillLearning);
  document.getElementById('btn-i-know-this').addEventListener('click', handleIKnowThis);
  document.getElementById('card-prev').addEventListener('click', goPrev);
  document.getElementById('card-next').addEventListener('click', goNext);

  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => rateCard(parseInt(btn.dataset.rating)));
  });
}

export function handleKey(e) {
  if (sessionCompleted) return;
  switch (e.key) {
    case ' ': case 'Enter':
      if (document.activeElement.classList.contains('rating-btn')) return;
      e.preventDefault(); flipCard(); break;
    case 'ArrowLeft': e.preventDefault(); goPrev(); break;
    case 'ArrowRight': e.preventDefault(); goNext(); break;
    case '0': case '1': case '2': case '3': case '4': case '5':
      if (isFlipped) { e.preventDefault(); rateCard(parseInt(e.key)); } break;
    case 'Escape':
      if (Object.keys(session.ratings).length > 0) Store.saveSession(session);
      window._activeSession = null;
      cleanup();
      Router.navigate('#/dashboard'); break;
  }
}

export function cleanup() {
  destroy$.next();
  if (timerSub) { timerSub.unsubscribe(); timerSub = null; }
}

export const StudyView = { render, handleKey, cleanup };

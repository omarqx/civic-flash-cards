/**
 * Reactive Store — localStorage persistence with RxJS BehaviorSubjects
 *
 * The store exposes observables for mastery, sessions, and settings.
 * Any subscriber gets the latest state and is notified when state changes.
 */
import { BehaviorSubject } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { FLASHCARDS, CATEGORIES, SESSION_TYPES } from './data.js';

const KEYS = {
  mastery: 'civic_mastery',
  sessions: 'civic_sessions',
  settings: 'civic_settings',
};

// ── Helpers ──
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

// ── Reactive state with BehaviorSubjects ──
const mastery$ = new BehaviorSubject(load(KEYS.mastery, {}));
const sessions$ = new BehaviorSubject(load(KEYS.sessions, []));
const settings$ = new BehaviorSubject(load(KEYS.settings, {
  hideMastered: false,
  shuffleDefault: false,
}));

// Persist to localStorage whenever subjects emit
mastery$.subscribe(data => save(KEYS.mastery, data));
sessions$.subscribe(data => save(KEYS.sessions, data));
settings$.subscribe(data => save(KEYS.settings, data));

// ── Derived observables ──

/** Observable of mastery stats { total, mastered, inProgress, notStarted } */
const masteryStats$ = mastery$.pipe(
  map(all => {
    let mastered = 0, inProgress = 0, notStarted = 0;
    FLASHCARDS.forEach(card => {
      const m = all[card.id];
      if (!m || m.reviewCount === 0) notStarted++;
      else if (m.masteryLevel >= 4) mastered++;
      else inProgress++;
    });
    return { total: FLASHCARDS.length, mastered, inProgress, notStarted };
  }),
  distinctUntilChanged((a, b) =>
    a.mastered === b.mastered && a.inProgress === b.inProgress && a.notStarted === b.notStarted
  ),
);

/** Observable of category stats map */
const categoryStats$ = mastery$.pipe(
  map(all => {
    const stats = {};
    Object.keys(CATEGORIES).forEach(catId => {
      const catCards = FLASHCARDS.filter(c => c.cat === catId);
      const mastered = catCards.filter(c => {
        const m = all[c.id];
        return m && m.masteryLevel >= 4;
      }).length;
      stats[catId] = {
        total: catCards.length,
        mastered,
        percent: catCards.length > 0 ? Math.round((mastered / catCards.length) * 100) : 0,
      };
    });
    return stats;
  }),
);

// ── Imperative API (backward compat, also mutates subjects) ──

function getMastery() {
  return mastery$.getValue();
}

function getCardMastery(cardId) {
  const all = mastery$.getValue();
  return all[cardId] || {
    rating: -1,
    ratingHistory: [],
    masteryLevel: 0,
    lastReviewedAt: null,
    reviewCount: 0,
  };
}

function setCardRating(cardId, rating) {
  const all = { ...mastery$.getValue() };
  const card = { ...(all[cardId] || {
    rating: -1,
    ratingHistory: [],
    masteryLevel: 0,
    lastReviewedAt: null,
    reviewCount: 0,
  }) };

  card.rating = rating;
  card.ratingHistory = [...card.ratingHistory, { rating, at: Date.now() }];
  card.reviewCount++;
  card.lastReviewedAt = Date.now();

  const recent = card.ratingHistory.slice(-5).map(r => r.rating);
  card.masteryLevel = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);

  all[cardId] = card;
  mastery$.next(all); // Pushes to all subscribers + persists
  return card;
}

function getMasteryStats() {
  // Synchronous snapshot
  const all = mastery$.getValue();
  let mastered = 0, inProgress = 0, notStarted = 0;
  FLASHCARDS.forEach(card => {
    const m = all[card.id];
    if (!m || m.reviewCount === 0) notStarted++;
    else if (m.masteryLevel >= 4) mastered++;
    else inProgress++;
  });
  return { total: FLASHCARDS.length, mastered, inProgress, notStarted };
}

function getCategoryStats() {
  const all = mastery$.getValue();
  const stats = {};
  Object.keys(CATEGORIES).forEach(catId => {
    const catCards = FLASHCARDS.filter(c => c.cat === catId);
    const mastered = catCards.filter(c => {
      const m = all[c.id];
      return m && m.masteryLevel >= 4;
    }).length;
    stats[catId] = {
      total: catCards.length,
      mastered,
      percent: catCards.length > 0 ? Math.round((mastered / catCards.length) * 100) : 0,
    };
  });
  return stats;
}

function isCardMastered(cardId) {
  const m = getCardMastery(cardId);
  return m.masteryLevel >= 4;
}

// ── Sessions ──
function getSessions() {
  return sessions$.getValue();
}

function createSession(type, categoryFilter = null) {
  const sessionType = SESSION_TYPES[type];
  if (!sessionType) return null;

  const all = mastery$.getValue();
  let pool = [...FLASHCARDS];

  if (categoryFilter && categoryFilter.length > 0) {
    pool = pool.filter(c => categoryFilter.includes(c.cat));
  }

  let selected;
  if (type === 'full') {
    selected = pool;
  } else {
    pool.sort((a, b) => {
      const ma = all[a.id] || { masteryLevel: 0, lastReviewedAt: 0, reviewCount: 0 };
      const mb = all[b.id] || { masteryLevel: 0, lastReviewedAt: 0, reviewCount: 0 };
      if (ma.reviewCount === 0 && mb.reviewCount > 0) return -1;
      if (mb.reviewCount === 0 && ma.reviewCount > 0) return 1;
      if (ma.masteryLevel !== mb.masteryLevel) return ma.masteryLevel - mb.masteryLevel;
      return (ma.lastReviewedAt || 0) - (mb.lastReviewedAt || 0);
    });
    selected = pool.slice(0, sessionType.cardCount);
  }

  return {
    id: `session_${Date.now()}`,
    type,
    typeName: sessionType.name,
    startedAt: Date.now(),
    completedAt: null,
    cardIds: selected.map(c => c.id),
    ratings: {},
    score: 0,
    categoryFilter,
  };
}

function saveSession(session) {
  const current = [...sessions$.getValue()];
  const ratings = Object.values(session.ratings);
  session.score = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;
  session.completedAt = Date.now();
  current.unshift(session);
  if (current.length > 100) current.length = 100;
  sessions$.next(current); // Pushes to all subscribers + persists
  return session;
}

// ── Settings ──
function getSettings() {
  return settings$.getValue();
}

function updateSettings(updates) {
  const current = { ...settings$.getValue(), ...updates };
  settings$.next(current);
  return current;
}

// ── Reset ──
function resetAll() {
  localStorage.removeItem(KEYS.mastery);
  localStorage.removeItem(KEYS.sessions);
  localStorage.removeItem(KEYS.settings);
  mastery$.next({});
  sessions$.next([]);
  settings$.next({ hideMastered: false, shuffleDefault: false });
}

export const Store = {
  // Observables (reactive)
  mastery$,
  sessions$,
  settings$,
  masteryStats$,
  categoryStats$,

  // Imperative (synchronous)
  getMastery,
  getCardMastery,
  setCardRating,
  getMasteryStats,
  getCategoryStats,
  isCardMastered,
  getSessions,
  createSession,
  saveSession,
  getSettings,
  updateSettings,
  resetAll,
};

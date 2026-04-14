/**
 * Reactive Store — localStorage persistence with RxJS BehaviorSubjects
 */
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { map } from 'rxjs/internal/operators/map';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { FLASHCARDS, CATEGORIES, SESSION_TYPES } from '../data/flashcards';
import type { CardMastery, StudySession, AppSettings, MasteryStats, CategoryStat, CategoryId } from '../types';
import { Observable } from 'rxjs/internal/Observable';

const KEYS = {
  mastery: 'civic_mastery',
  sessions: 'civic_sessions',
  settings: 'civic_settings',
} as const;

// ── Reactive state ──
const mastery$ = new BehaviorSubject<Record<number, CardMastery>>(
  load(KEYS.mastery, {})
);
const sessions$ = new BehaviorSubject<StudySession[]>(
  load(KEYS.sessions, [])
);
const settings$ = new BehaviorSubject<AppSettings>(
  load(KEYS.settings, { hideMastered: false, shuffleDefault: false })
);

// Auto-persist
mastery$.subscribe(d => save(KEYS.mastery, d));
sessions$.subscribe(d => save(KEYS.sessions, d));
settings$.subscribe(d => save(KEYS.settings, d));

// ── Derived observables ──
const masteryStats$: Observable<MasteryStats> = mastery$.pipe(
  map((all): MasteryStats => {
    let mastered = 0, inProgress = 0, notStarted = 0;
    for (const card of FLASHCARDS) {
      const m = all[card.id];
      if (!m || m.reviewCount === 0) notStarted++;
      else if (m.masteryLevel >= 4) mastered++;
      else inProgress++;
    }
    return { total: FLASHCARDS.length, mastered, inProgress, notStarted };
  }),
  distinctUntilChanged((a, b) =>
    a.mastered === b.mastered && a.inProgress === b.inProgress && a.notStarted === b.notStarted
  ),
);

const categoryStats$: Observable<Record<CategoryId, CategoryStat>> = mastery$.pipe(
  map((all): Record<CategoryId, CategoryStat> => {
    const stats = {} as Record<CategoryId, CategoryStat>;
    for (const catId of Object.keys(CATEGORIES) as CategoryId[]) {
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
    }
    return stats;
  }),
);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

// ── Default mastery record ──
function defaultMastery(): CardMastery {
  return { rating: -1, ratingHistory: [], masteryLevel: 0, lastReviewedAt: null, reviewCount: 0 };
}

// ── Imperative API ──
function getMastery(): Record<number, CardMastery> {
  return mastery$.getValue();
}

function getCardMastery(cardId: number): CardMastery {
  return mastery$.getValue()[cardId] || defaultMastery();
}

function setCardRating(cardId: number, rating: number): CardMastery {
  const all = { ...mastery$.getValue() };
  const card = { ...(all[cardId] || defaultMastery()) };
  card.rating = rating;
  card.ratingHistory = [...card.ratingHistory, { rating, at: Date.now() }];
  card.reviewCount++;
  card.lastReviewedAt = Date.now();
  const recent = card.ratingHistory.slice(-5).map(r => r.rating);
  card.masteryLevel = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
  all[cardId] = card;
  mastery$.next(all);
  return card;
}

function getMasteryStats(): MasteryStats {
  const all = mastery$.getValue();
  let mastered = 0, inProgress = 0, notStarted = 0;
  for (const card of FLASHCARDS) {
    const m = all[card.id];
    if (!m || m.reviewCount === 0) notStarted++;
    else if (m.masteryLevel >= 4) mastered++;
    else inProgress++;
  }
  return { total: FLASHCARDS.length, mastered, inProgress, notStarted };
}

function getCategoryStats(): Record<CategoryId, CategoryStat> {
  const all = mastery$.getValue();
  const stats = {} as Record<CategoryId, CategoryStat>;
  for (const catId of Object.keys(CATEGORIES) as CategoryId[]) {
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
  }
  return stats;
}

function isCardMastered(cardId: number): boolean {
  const m = getCardMastery(cardId);
  return m.masteryLevel >= 4;
}

// ── Sessions ──
function getSessions(): StudySession[] {
  return sessions$.getValue();
}

function createSession(type: string, categoryFilter: string[] | null = null): StudySession | null {
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
      const ma = all[a.id] || defaultMastery();
      const mb = all[b.id] || defaultMastery();
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

function saveSession(session: StudySession): StudySession {
  const current = [...sessions$.getValue()];
  const ratings = Object.values(session.ratings);
  session.score = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;
  session.completedAt = Date.now();
  current.unshift(session);
  if (current.length > 100) current.length = 100;
  sessions$.next(current);
  return session;
}

// ── Settings ──
function getSettings(): AppSettings {
  return settings$.getValue();
}

function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const current = { ...settings$.getValue(), ...updates };
  settings$.next(current);
  return current;
}

// ── Reset ──
function resetAll(): void {
  localStorage.removeItem(KEYS.mastery);
  localStorage.removeItem(KEYS.sessions);
  localStorage.removeItem(KEYS.settings);
  mastery$.next({});
  sessions$.next([]);
  settings$.next({ hideMastered: false, shuffleDefault: false });
}

export const Store = {
  mastery$, sessions$, settings$, masteryStats$, categoryStats$,
  getMastery, getCardMastery, setCardRating, getMasteryStats, getCategoryStats,
  isCardMastered, getSessions, createSession, saveSession,
  getSettings, updateSettings, resetAll,
};

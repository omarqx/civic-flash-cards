// ── Shared TypeScript types for Civic Flash Cards ──

export type CategoryId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
}

export interface Flashcard {
  id: number;            // official USCIS number — immutable (mastery key)
  q: string;
  cat: CategoryId;
  answers: string[];     // discrete acceptable answers (≥1), official wording
  requires: number;      // how many the officer asks for (1–5)
  note?: string;         // guidance for user-specific answers
  why?: string;          // 1–2 sentence factual explanation (authored Tasks 2–4)
  hint?: string;         // short memory hook (authored Tasks 2–4)
  related?: number[];    // cross-linked card ids
}

export interface CardMastery {
  rating: number;
  ratingHistory: RatingEntry[];
  masteryLevel: number;
  lastReviewedAt: number | null;
  reviewCount: number;
}

export interface RatingEntry {
  rating: number;
  at: number;
}

export interface SessionType {
  id: string;
  name: string;
  cardCount: number;
  icon: string;
  timeLimit: number;
  description: string;
}

export interface StudySession {
  id: string;
  type: string;
  typeName: string;
  startedAt: number;
  completedAt: number | null;
  cardIds: number[];
  ratings: Record<number, number>;
  score: number;
  categoryFilter?: string[] | null;
}

export interface AppSettings {
  hideMastered: boolean;
  shuffleDefault: boolean;
  theme: 'light' | 'dark' | 'system';
  interviewDate: string | null;        // ISO YYYY-MM-DD, local calendar
  interviewDateIsDefault: boolean;     // true when set via "Skip — plan 1 month"
  prepStartDate: string | null;        // anchors the punch-card grid
}

export interface PunchDay { quota: number; mastered: number; }
export type PunchLog = Record<string, PunchDay>;

export interface DailyPlan {
  interviewDate: string | null;
  isDefault: boolean;
  daysLeft: number;        // daysBetween(today, interviewDate); 30 when no date is set; 0 = interview day; negative = expired
  expired: boolean;        // daysLeft < 0
  quotaToday: number;
  masteredToday: number;
  dailySize: number;       // clamp(quotaToday + 6, 10, 40)
}

export interface MasteryStats {
  total: number;
  mastered: number;
  inProgress: number;
  notStarted: number;
}

export interface CategoryStat {
  total: number;
  mastered: number;
  percent: number;
}

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export type ViewName = 'dashboard' | 'study' | 'library' | 'stats' | 'settings';

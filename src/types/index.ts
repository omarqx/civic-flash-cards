// ── Shared TypeScript types for Civic Flash Cards ──

export type CategoryId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
}

export interface Flashcard {
  id: number;
  q: string;
  a: string;
  cat: CategoryId;
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

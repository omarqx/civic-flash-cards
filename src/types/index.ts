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
  requires: 1 | 2 | 3 | 4 | 5;      // how many the officer asks for (1–5)
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
  playbackRate: number;      // 0.75–1.5, default 1
  recallGapSeconds: number;  // 3 | 5 | 8, default 5
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

// ── Audio playback ──

export type ClipKind = 'q' | 'a';

export interface AudioClipMeta {
  hash: string;      // sha256 of voice + final spoken text
  duration: number;  // seconds, measured at generation time
}

/** Keys are clip names: "q-17", "a-17". */
export type AudioManifest = Record<string, AudioClipMeta>;

export type ListenPhase = 'question' | 'gap' | 'answer';

export interface ListenQueueItem {
  cardId: number;
  qDuration: number;   // raw seconds at 1× (0 if clip missing)
  aDuration: number;   // raw seconds at 1× (0 if clip missing)
  gap: number;         // wall-clock seconds
  total: number;       // seconds at the queue's rate, incl. gap
  startOffset: number; // seconds from queue start, at the queue's rate
}

export interface ListenQueue {
  items: ListenQueueItem[];
  totalDuration: number; // seconds at the queue's rate
  gapSeconds: number;
  rate: number;
}

export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'complete';

export interface PlayerPosition {
  cardIndex: number;
  phase: ListenPhase;
  cardElapsed: number;    // seconds into the current card
  totalElapsed: number;   // seconds into the whole queue
  phaseRemaining: number; // seconds left in the current phase (drives the gap countdown)
}

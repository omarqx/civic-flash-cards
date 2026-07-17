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
  theme: 'light' | 'dark' | 'system';
  playbackRate: number;      // 0.75–1.5, default 1
  recallGapSeconds: number;  // 3 | 5 | 8, default 5
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

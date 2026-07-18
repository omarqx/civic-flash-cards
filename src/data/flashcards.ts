/**
 * USCIS 2025 Naturalization Civics Test — official 128-question bank.
 * Question ids match the official USCIS numbering (M-1778, reinstated for the
 * 2025 civics test). Categories A–H map onto the official subsections.
 */
import type { Category, CategoryId, Flashcard, SessionType } from '../types';
import { CARDS_A } from './cards/a';
import { CARDS_B } from './cards/b';
import { CARDS_C } from './cards/c';
import { CARDS_D } from './cards/d';
import { CARDS_E } from './cards/e';
import { CARDS_F } from './cards/f';
import { CARDS_G } from './cards/g';
import { CARDS_H } from './cards/h';

export const CATEGORIES: Record<CategoryId, Category> = {
  A: { id: 'A', name: 'Principles of American Government', icon: 'balance', color: '#2a6b2c' },
  B: { id: 'B', name: 'System of Government', icon: 'account_balance', color: '#4d626c' },
  C: { id: 'C', name: 'Rights and Responsibilities', icon: 'gavel', color: '#4b6551' },
  D: { id: 'D', name: 'Colonial Period and Independence', icon: 'flag', color: '#9e422c' },
  E: { id: 'E', name: '1800s', icon: 'history', color: '#6d4c41' },
  F: { id: 'F', name: 'Recent American History', icon: 'public', color: '#455a64' },
  G: { id: 'G', name: 'Symbols', icon: 'star', color: '#2e7d32' },
  H: { id: 'H', name: 'Holidays', icon: 'celebration', color: '#1565c0' },
};

export const FLASHCARDS: Flashcard[] = [
  ...CARDS_A, ...CARDS_B, ...CARDS_C, ...CARDS_D,
  ...CARDS_E, ...CARDS_F, ...CARDS_G, ...CARDS_H,
];

export const SESSION_TYPES: Record<string, SessionType> = {
  mock: { id: 'mock', name: 'Interview Mock', cardCount: 20, icon: 'record_voice_over', timeLimit: 7, description: 'Simulate a real interview' },
  daily: { id: 'daily', name: 'Daily Review', cardCount: 16, icon: 'today', timeLimit: 15, description: 'Quick daily practice' },
  weekly: { id: 'weekly', name: 'Weekly Review', cardCount: 32, icon: 'date_range', timeLimit: 30, description: 'Reinforce weekly progress' },
  monthly: { id: 'monthly', name: 'Monthly Review', cardCount: 64, icon: 'calendar_month', timeLimit: 60, description: 'Comprehensive monthly check' },
  full: { id: 'full', name: 'Full Study', cardCount: 128, icon: 'school', timeLimit: 0, description: 'Study all 128 questions' },
};

export const STUDY_TIPS: string[] = [
  "Saying the answers out loud helps bridge the gap between passive recognition and active recall.",
  "Try to answer before flipping the card. Active recall strengthens memory more than passive review.",
  "Take breaks every 20-25 minutes. Your brain consolidates memories during rest periods.",
  "Focus on cards rated 0-2 first. These need the most attention before your interview.",
  "Relate answers to personal experiences or current events to make them more memorable.",
  "Teaching someone else what you've learned is one of the most effective study techniques.",
  "Try grouping related questions together mentally — it helps with associative memory.",
  "Don't rush through cards. Spend a moment reflecting on each answer, even ones you know well.",
  "At your interview, the officer asks up to 20 of the 128 questions and you need 12 correct. Focus on your weakest areas.",
  "Review your mistakes from the last session before starting a new one.",
];

export const CAT_CSS: Record<CategoryId, string> = {
  A: 'cat-A', B: 'cat-B', C: 'cat-C', D: 'cat-D',
  E: 'cat-E', F: 'cat-F', G: 'cat-G', H: 'cat-H',
};

export const CAT_COLORS: Record<CategoryId, string> = {
  A: '#46608F', B: '#5A7350', C: '#A05C3B', D: '#8A6F2F',
  E: '#4E6A6A', F: '#6A7A42', G: '#9E5A55', H: '#8A7B4F',
};

export const SESSION_BADGE_COLORS: Record<string, string> = {
  mock: 'cat-D', daily: 'cat-A', weekly: 'cat-B', monthly: 'cat-E', full: 'cat-G',
};

/**
 * Session Manager — typed replacement for window._activeSession
 */
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import type { StudySession } from '../types';

const active$ = new BehaviorSubject<StudySession | null>(null);

export const SessionManager = {
  session$: active$.asObservable(),
  get: (): StudySession | null => active$.getValue(),
  set: (session: StudySession | null): void => active$.next(session),
  clear: (): void => active$.next(null),
};

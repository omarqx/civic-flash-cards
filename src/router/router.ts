/**
 * Router — Hash-based SPA router with RxJS
 */
import { fromEvent } from 'rxjs/internal/observable/fromEvent';
import { Subject } from 'rxjs/internal/Subject';

type RouteHandler = (params: Record<string, string>) => void;

const routes: Record<string, RouteHandler> = {};
let currentRoute: string | null = null;

export const routeSegment$ = new Subject<string>();

export function register(pattern: string, handler: RouteHandler): void {
  routes[pattern] = handler;
}

export function navigate(hash: string): void {
  window.location.hash = hash;
}

function getParams(pattern: string, hash: string): Record<string, string> {
  const patternParts = pattern.split('/');
  const hashParts = hash.split('/');
  const params: Record<string, string> = {};
  patternParts.forEach((part, i) => {
    if (part.startsWith(':')) {
      params[part.slice(1)] = hashParts[i];
    }
  });
  return params;
}

interface MatchResult {
  handler: RouteHandler;
  params: Record<string, string>;
  segment: string;
}

function match(hash: string): MatchResult | null {
  hash = hash.replace(/^#\/?/, '').replace(/\/$/, '') || 'dashboard';

  if (routes[hash]) {
    return { handler: routes[hash], params: {}, segment: hash.split('/')[0] };
  }

  for (const pattern of Object.keys(routes)) {
    const patternParts = pattern.split('/');
    const hashParts = hash.split('/');
    if (patternParts.length !== hashParts.length) continue;

    let isMatch = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) continue;
      if (patternParts[i] !== hashParts[i]) { isMatch = false; break; }
    }

    if (isMatch) {
      return { handler: routes[pattern], params: getParams(pattern, hash), segment: hash.split('/')[0] };
    }
  }

  return routes['dashboard']
    ? { handler: routes['dashboard'], params: {}, segment: 'dashboard' }
    : null;
}

export function handleRoute(): void {
  const hash = window.location.hash;
  const result = match(hash);
  if (result) {
    currentRoute = hash;
    result.handler(result.params);
    updateNav(hash);
    routeSegment$.next(result.segment);
  }
}

function updateNav(hash: string): void {
  const normalized = hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
  document.querySelectorAll<HTMLElement>('.nav-link[data-route]').forEach(link => {
    const route = link.dataset.route;
    link.classList.toggle('active', route === normalized);
  });
  document.body.classList.toggle('study-active', normalized === 'study');
}

export function init(): void {
  fromEvent(window, 'hashchange').subscribe(() => handleRoute());
  if (!window.location.hash) {
    window.location.hash = '#/dashboard';
  } else {
    handleRoute();
  }
}

export function getCurrentRoute(): string | null {
  return currentRoute;
}

export const Router = { register, navigate, init, getCurrentRoute, handleRoute };

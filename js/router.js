/**
 * Router — Hash-based SPA router with RxJS
 */
import { fromEvent, Subject } from 'rxjs';
import { map, startWith, distinctUntilChanged, share } from 'rxjs/operators';

const routes = {};
let currentRoute = null;

/** Subject that emits the current normalized route segment (e.g. 'dashboard', 'library') */
export const routeSegment$ = new Subject();

export function register(pattern, handler) {
  routes[pattern] = handler;
}

export function navigate(hash) {
  window.location.hash = hash;
}

function getParams(pattern, hash) {
  const patternParts = pattern.split('/');
  const hashParts = hash.split('/');
  const params = {};
  patternParts.forEach((part, i) => {
    if (part.startsWith(':')) {
      params[part.slice(1)] = hashParts[i];
    }
  });
  return params;
}

function match(hash) {
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

  return { handler: routes['dashboard'], params: {}, segment: 'dashboard' };
}

export function handleRoute() {
  const hash = window.location.hash;
  const result = match(hash);
  if (result && result.handler) {
    currentRoute = hash;
    result.handler(result.params);
    updateNav(hash);
    routeSegment$.next(result.segment);
  }
}

function updateNav(hash) {
  const normalizedHash = hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
  document.querySelectorAll('.nav-link[data-route]').forEach(link => {
    const route = link.dataset.route;
    link.classList.toggle('active', route === normalizedHash);
  });
  const isStudy = normalizedHash === 'study';
  document.body.classList.toggle('study-active', isStudy);
}

export function init() {
  // Use RxJS fromEvent for hashchange
  fromEvent(window, 'hashchange').subscribe(() => handleRoute());

  if (!window.location.hash) {
    window.location.hash = '#/dashboard';
  } else {
    handleRoute();
  }
}

export function getCurrentRoute() {
  return currentRoute;
}

export const Router = { register, navigate, init, getCurrentRoute, handleRoute };

/**
 * A router the size of the problem.
 *
 * The CMS has one flat level of pages under /admin and no route params worth
 * parsing, so it needs `pushState` plus a re-render — not a routing library.
 * `navigate()` is exported on its own so non-React code (the portfolio's edit
 * bar) can send you into the CMS.
 */

import { useCallback, useSyncExternalStore } from 'react';

const CHANGE = 'cms:navigate';

/** The prefix that hands the browser over to the CMS instead of the portfolio. */
export const ADMIN_ROOT = '/admin';

export const isAdminPath = (path = window.location.pathname) =>
  path === ADMIN_ROOT || path.startsWith(`${ADMIN_ROOT}/`);

export function navigate(to: string, { replace = false } = {}) {
  if (to === window.location.pathname + window.location.search) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
  window.dispatchEvent(new CustomEvent(CHANGE));
}

function subscribe(fn: () => void) {
  window.addEventListener('popstate', fn);
  window.addEventListener(CHANGE, fn);
  return () => {
    window.removeEventListener('popstate', fn);
    window.removeEventListener(CHANGE, fn);
  };
}

const path = () => window.location.pathname;

export function useRoute() {
  const pathname = useSyncExternalStore(subscribe, path, path);
  const go = useCallback((to: string) => navigate(to), []);

  return {
    pathname,
    /** The bit after /admin — '' for the dashboard. */
    page: pathname.replace(ADMIN_ROOT, '').replace(/^\/+|\/+$/g, ''),
    navigate: go,
  };
}

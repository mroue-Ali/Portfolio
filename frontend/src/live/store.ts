/**
 * Keeps the rendered page in step with edits made to it.
 *
 * The content modules are mutable singletons that `loadContent()` fills in
 * before the first paint — deliberately, so components can `import { about }`
 * and GSAP measures a settled DOM. That design has no notion of "changed", which
 * is fine for a page nobody edits and useless the moment you can edit it.
 *
 * This is the missing half: a version counter components subscribe to. An edit
 * mutates the same objects the components already hold and bumps the counter;
 * React re-renders the existing tree with the new text, so nothing remounts and
 * no ScrollTrigger is invalidated.
 *
 * `contentChanged()` is the coarse version, for edits made through the CMS forms
 * where the local objects are not the ones that changed: it refetches
 * `/api/content` and re-hydrates. It costs one request and only fires when
 * something is actually listening, so calling it from the /admin app — where no
 * portfolio is mounted — does nothing.
 */

import { useSyncExternalStore } from 'react';
import { loadContent } from '../content';

let version = 0;
const listeners = new Set<() => void>();

const emit = () => {
  version += 1;
  listeners.forEach((fn) => fn());
};

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const snapshot = () => version;

/**
 * Re-renders the calling component whenever the content changes.
 *
 * Mounted once high in the tree (see `EditProvider`) it covers the whole page:
 * everything below reads the same mutated singletons on the next render.
 */
export function useContentVersion(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Applies a local mutation and repaints. Used by inline edits, which already
 *  know exactly what changed and don't need a round trip to find out. */
export function applyLocal(mutate: () => void) {
  mutate();
  emit();
}

let pending: number | undefined;

/**
 * Something was written through the API; pull the canonical content back.
 *
 * Debounced, because a burst of saves (a reorder is one call per list, a panel
 * save can touch several rows) should cost one refetch, not one each.
 */
export function contentChanged(delay = 250) {
  if (listeners.size === 0) return; // nothing is rendering the site
  window.clearTimeout(pending);
  pending = window.setTimeout(async () => {
    await loadContent({ fresh: true });
    emit();
  }, delay);
}

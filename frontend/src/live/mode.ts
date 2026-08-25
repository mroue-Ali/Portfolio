/**
 * Whether the page is in edit mode.
 *
 * A module store rather than context, for the same reason as `session.ts`: the
 * edit bar, every `<Editable>`, and the slide-over panel all need it, and
 * threading a provider through components whose only job is layout would put
 * editing concerns into files that should not have any.
 *
 * The choice is remembered per browser, so reloading the page you were editing
 * lands you back in edit mode instead of read-only. `?edit=1` turns it on — that
 * is the link the CMS opens the site with.
 */

import { useSyncExternalStore } from 'react';
import { isSignedIn } from '../cms/session';

const KEY = 'portfolio.cms.editmode';

let enabled = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const snapshot = () => enabled;

export function useEditMode(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const isEditing = () => enabled;

export function setEditMode(next: boolean) {
  if (enabled === next) return;
  enabled = next;
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    /* private mode; the toggle still works for this page */
  }
  // Lets CSS and the cursor layer react without every element subscribing.
  document.documentElement.toggleAttribute('data-edit-mode', next);
  emit();
}

export const toggleEditMode = () => setEditMode(!enabled);

/**
 * Restores the remembered choice. Only ever called once a session is confirmed,
 * so a signed-out visitor cannot land in a mode that would only 401.
 */
export function restoreEditMode() {
  if (!isSignedIn()) return;
  const wanted =
    new URLSearchParams(window.location.search).get('edit') === '1' ||
    localStorage.getItem(KEY) === '1';
  if (wanted) setEditMode(true);
}

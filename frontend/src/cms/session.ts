/**
 * Who is signed in, for both apps.
 *
 * A module-level store rather than a React context, because two separate trees
 * need it: the CMS at /admin, and the edit bar the portfolio shows when you are
 * signed in. `useSession()` subscribes either of them through
 * `useSyncExternalStore`, so a sign-out in one tab's CMS drops the edit bar on
 * the page behind it.
 *
 * A token in localStorage is only a claim. `restore()` spends one request on
 * `/api/auth/me` to have the server confirm it before anything renders as
 * signed in — which is also how a revoked or expired token gets cleared.
 */

import { useSyncExternalStore } from 'react';
import { ApiError, UNAUTHORIZED_EVENT, request, setToken } from './api';

export type User = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  is_active: boolean;
  last_login_at: string | null;
};

export type Session = {
  /** `unknown` until `restore()` has had its say — render a splash, not a form. */
  status: 'unknown' | 'signed-in' | 'signed-out';
  user: User | null;
};

let session: Session = { status: 'unknown', user: null };
const listeners = new Set<() => void>();

function set(next: Session) {
  session = next;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const snapshot = () => session;

export function useSession(): Session {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** The signed-in user, or null — for code outside React. */
export const currentUser = () => session.user;

export const isSignedIn = () => session.status === 'signed-in';

type LoginResponse = { access_token: string; expires_in: number; user: User };

export async function signIn(username: string, password: string): Promise<User> {
  const data = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ username, password }),
  });
  setToken(data.access_token);
  set({ status: 'signed-in', user: data.user });
  return data.user;
}

export function signOut() {
  setToken(null);
  set({ status: 'signed-out', user: null });
}

let restoring: Promise<Session> | null = null;

/**
 * Confirms the stored token with the server. Safe to call from anywhere and as
 * often as you like — concurrent callers share the one in-flight request.
 */
export function restore(): Promise<Session> {
  if (restoring) return restoring;

  restoring = (async () => {
    if (!localStorage.getItem('portfolio.cms.token')) {
      set({ status: 'signed-out', user: null });
      return session;
    }
    try {
      const user = await request<User>('/api/auth/me');
      set({ status: 'signed-in', user });
    } catch (error) {
      // A network blip shouldn't throw away a good token: only an outright
      // rejection from the server means the session is really gone.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        setToken(null);
      }
      set({ status: 'signed-out', user: null });
    } finally {
      restoring = null;
    }
    return session;
  })();

  return restoring;
}

export function updateCurrentUser(patch: Partial<User>) {
  if (session.user) set({ ...session, user: { ...session.user, ...patch } });
}

// Any 401 from any request means the token is no longer good.
window.addEventListener(UNAUTHORIZED_EVENT, () => {
  if (session.status !== 'signed-out') signOut();
});

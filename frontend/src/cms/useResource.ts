/**
 * Fetch on mount, with a reload.
 *
 * Every CMS page needs the same three pieces of state and nobody needs more, so
 * this is the whole data layer — no cache, no query client. The loader is
 * captured rather than watched: an editor owns one resource for its lifetime,
 * and the one place where the resource changes (opening a different stack
 * group) mounts a new editor anyway.
 *
 * Reloading bumps a counter that the effect depends on, so every `setState`
 * happens in a promise callback rather than in the effect body — which is both
 * what the React rules want and what avoids a render cascade on mount.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from './tokens';

type State<T> = { data: T | null; error: string | null; loading: boolean };

export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  // Kept current so a reload runs the newest closure, without re-fetching every
  // time the parent re-renders and hands us a new arrow function.
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  });

  useEffect(() => {
    let alive = true;
    loader.current().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState((prev) => ({ ...prev, error: message(error), loading: false })),
    );
    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    setTick((n) => n + 1);
  }, []);

  /** Lets a caller apply a change it already knows about, without a round trip. */
  const setData = useCallback((data: T) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  return { ...state, reload, setData };
}

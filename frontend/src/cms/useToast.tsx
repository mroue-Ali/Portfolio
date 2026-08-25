/**
 * A message that says something worked, then gets out of the way.
 *
 * Its own module so `ui.tsx` stays components-only (fast refresh), and because
 * a hook that returns an element is the shape that made every caller a
 * two-liner: `const toast = useToast()`, then `{toast.element}`.
 */

import { useEffect, useRef, useState } from 'react';
import { Toast } from './ui';

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (message: string, tone: 'ok' | 'error' = 'ok') => {
    window.clearTimeout(timer.current);
    setToast({ message, tone });
    // Errors are read, not glanced at; they get longer.
    timer.current = window.setTimeout(() => setToast(null), tone === 'ok' ? 2200 : 5000);
  };

  return {
    show,
    element: toast ? <Toast message={toast.message} tone={toast.tone} /> : null,
  };
}

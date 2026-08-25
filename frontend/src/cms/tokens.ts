/**
 * The CMS's colours and mono type.
 *
 * The same palette as `src/theme.ts` — the CMS is the same product as the site
 * and should not look like a different one. Kept apart from `ui.tsx` because a
 * module that exports both components and constants breaks fast refresh.
 */

import type { CSSProperties } from 'react';

export const cms = {
  bg: '#15181D',
  surface: '#1E2228',
  raised: '#232830',
  border: '#2F353E',
  text: '#E9ECF0',
  muted: '#9AA2AD',
  violet: '#7B68FA',
  cyan: '#45D9EF',
  danger: '#FF6B6B',
  ok: '#4ADE80',
} as const;

export const mono: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

/** Where a form is in its save cycle. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Every API failure the CMS shows a human is funnelled through this. */
export const message = (error: unknown): string =>
  (error as Error)?.message || 'Something went wrong';

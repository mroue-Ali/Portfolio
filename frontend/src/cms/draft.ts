/**
 * Draft state for one record: what it says, whether it differs from what was
 * loaded, and a save that reports where it got to.
 *
 * Kept apart from `editors.tsx` for the same reason `tokens.ts` is kept apart
 * from `ui.tsx` — a module that exports both components and plain functions
 * breaks fast refresh. It is also what lets a bespoke page like Theme reuse the
 * exact save behaviour the generic editors have without reimplementing it, so
 * "dirty" and "saved" mean one thing across the whole CMS.
 */

import { useCallback, useState } from 'react';
import type { FieldSpec } from './fields';
import { normalise } from './normalise';
import { contentChanged } from '../live/store';
import { message, type SaveState } from './tokens';

export type Draft = Record<string, unknown>;

const changed = (draft: Draft, original: Draft) =>
  JSON.stringify(draft) !== JSON.stringify(original);

/** Only the fields the spec owns — never the id, timestamps, or position. */
export const pick = (specs: readonly FieldSpec[], row: Draft): Draft =>
  Object.fromEntries(specs.map((spec) => [spec.name, row[spec.name]]));

export function useDraft(
  initial: Draft,
  specs: readonly FieldSpec[],
  write: (payload: Draft) => Promise<Draft | void>,
) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [original, setOriginal] = useState<Draft>(initial);
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = useCallback((name: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
  }, []);

  /**
   * Several fields at once, as one change.
   *
   * Picking a palette writes seven colours and the preset name together; doing
   * that as eight calls to `set` would be eight renders, and — worse — eight
   * chances for the dirty check to see a half-applied palette.
   */
  const setMany = useCallback((values: Draft) => {
    setDraft((prev) => ({ ...prev, ...values }));
  }, []);

  const save = async () => {
    setState('saving');
    setError(null);
    try {
      const payload = normalise(specs, draft);
      const saved = await write(payload);
      // The server may have normalised something; trust its copy when it sends one.
      const settled = saved ? pick(specs, saved as Draft) : payload;
      setDraft(settled);
      setOriginal(settled);
      setState('saved');
      contentChanged();
      window.setTimeout(() => setState('idle'), 1700);
    } catch (err) {
      setError(message(err));
      setState('error');
    }
  };

  return { draft, set, setMany, save, state, error, dirty: changed(draft, original) };
}

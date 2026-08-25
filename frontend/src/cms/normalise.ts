/**
 * What a draft looks like on the way to the database.
 *
 * Its own module because it is neither a component nor a control: a form's
 * state is what someone typed, and a row is what should be stored, and the two
 * differ in exactly one way — half-typed list entries.
 */

import type { FieldSpec } from './fields';

/** Empty entries are how a half-typed list looks; they are not content. */
export const cleanList = (items: string[] | undefined): string[] =>
  (items ?? []).map((item) => item.trim()).filter(Boolean);

/** Trims list fields on the way out, so blanks never reach the database. */
export function normalise<T extends Record<string, unknown>>(specs: readonly FieldSpec[], draft: T): T {
  const out = { ...draft };
  for (const spec of specs) {
    if (spec.type === 'list') {
      out[spec.name as keyof T] = cleanList(draft[spec.name] as string[]) as T[keyof T];
    }
  }
  return out;
}

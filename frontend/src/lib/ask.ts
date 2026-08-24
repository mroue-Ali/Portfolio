import { answers, ask as askConfig, SOURCE_NODES } from '../content';
import type { Source } from '../hooks/useVectorField';

export type Resolved = { answer: string; sources: Source[] };

const toSources = (indices: readonly number[]): Source[] =>
  indices.map((i) => SOURCE_NODES[i]).filter(Boolean).map((n) => ({ ...n }));

/**
 * Keyword matcher over the written answers.
 *
 * An exact question match wins outright; otherwise each matched keyword scores
 * its own length, so a specific term outweighs a generic one.
 */
export function pickCanned(text: string): Resolved {
  const q = (text || '').toLowerCase().trim();
  let best: (typeof answers)[number] | null = null;
  let bestScore = 0;

  for (const a of answers) {
    let score = 0;
    if (a.question.toLowerCase() === q) {
      score = 99;
    } else {
      for (const k of a.keywords) {
        if (q.includes(k)) score += k.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }

  if (!best) {
    return { answer: askConfig.fallback, sources: toSources(askConfig.fallbackSources) };
  }
  return { answer: best.answer, sources: toSources(best.sources) };
}

/** Set VITE_ASK_API to point the bar at a real retrieval endpoint. */
const ASK_API = import.meta.env.VITE_ASK_API as string | undefined;

/**
 * Resolves a question, preferring the retrieval backend when one is configured.
 *
 * Any failure — no endpoint, network, timeout, malformed body — falls back to
 * the written answers, so the bar always responds.
 */
export async function resolveAnswer(question: string): Promise<Resolved> {
  if (!ASK_API) return pickCanned(question);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(ASK_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return pickCanned(question);

    const data: unknown = await res.json();
    const answer =
      typeof data === 'object' && data && 'answer' in data ? String(data.answer ?? '') : '';
    if (!answer.trim()) return pickCanned(question);

    // Backend returns source tags; map them onto the nodes the canvas knows.
    const tags =
      typeof data === 'object' && data && 'sources' in data && Array.isArray(data.sources)
        ? (data.sources as unknown[]).map(String)
        : [];
    const sources = tags
      .map((tag) => SOURCE_NODES.find((n) => n.tag === tag))
      .filter((n): n is (typeof SOURCE_NODES)[number] => Boolean(n))
      .map((n) => ({ ...n }));

    return {
      answer,
      sources: sources.length ? sources : toSources(askConfig.fallbackSources),
    };
  } catch {
    return pickCanned(question);
  }
}

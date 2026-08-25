import { answers, ask as askConfig } from '../content';

/**
 * Keyword matcher over the written answers.
 *
 * An exact question match wins outright; otherwise each matched keyword scores
 * its own length, so a specific term outweighs a generic one. Deliberately the
 * same scoring as `backend/app/ask.py`, so an offline visitor and a visitor the
 * backend cannot answer for get the same reply.
 */
export function pickCanned(text: string): string {
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

  return best ? best.answer : askConfig.fallback;
}

/** Set VITE_ASK_API to point the bar at the backend. */
const ASK_API = import.meta.env.VITE_ASK_API as string | undefined;

/** The streaming sibling of whatever VITE_ASK_API points at. */
const STREAM_API = ASK_API ? `${ASK_API.replace(/\/+$/, '')}/stream` : undefined;

/** How long to wait for the *first* chunk. Cleared once text starts arriving. */
const FIRST_CHUNK_TIMEOUT = 20_000;

/**
 * Streams an answer, calling `onChunk` with each piece as it arrives.
 *
 * Resolves when the answer is complete. Any failure before the first chunk —
 * no endpoint, network, timeout, a non-200 — falls back to the written answers
 * and emits them in one piece, so the bar always responds.
 *
 * A failure *after* the first chunk cannot fall back: the visitor is already
 * reading. It resolves with whatever arrived rather than replacing a half
 * answer with a different one, which is also what the backend does.
 */
export async function streamAnswer(
  question: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!STREAM_API) {
    onChunk(pickCanned(question));
    return;
  }

  let started = false;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  // Only guards the wait for the first byte; a long answer is not a stall.
  let timer: number | undefined = window.setTimeout(abort, FIRST_CHUNK_TIMEOUT);

  try {
    const res = await fetch(STREAM_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`ask: HTTP ${res.status}`);

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;

      // SSE frames are separated by a blank line; anything after the last one
      // is a partial frame that needs the next read before it can be parsed.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const event = /^event:\s*(.+)$/m.exec(frame)?.[1]?.trim();
        const data = /^data:\s*(.+)$/m.exec(frame)?.[1];
        if (event === 'done') return;
        if (event !== 'delta' || !data) continue;

        let text = '';
        try {
          text = JSON.parse(data).text ?? '';
        } catch {
          continue;
        }
        if (!text) continue;

        if (!started) {
          started = true;
          window.clearTimeout(timer);
          timer = undefined;
        }
        onChunk(text);
      }
    }
  } catch (err) {
    // Deliberate close from the caller — not a failure, and not ours to answer.
    if (signal?.aborted) return;
    if (started) return;
    onChunk(pickCanned(question));
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }

  if (!started) onChunk(pickCanned(question));
}

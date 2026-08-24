import { useEffect, useRef, type RefObject } from 'react';
import { canHover, prefersReducedMotion } from '../lib/motion';

export type Source = { tag: string; target: string };

/** A source once the field has picked a node to represent it. */
type ActiveNode = Source & { node: number | null };

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** The answer panel — retrieval curves are drawn from lit nodes to its top edge. */
  panelRef: RefObject<HTMLElement | null>;
  /** Container of the absolutely-positioned source labels. */
  labelsRef: RefObject<HTMLElement | null>;
  /** Sources currently being cited. Changing this re-lights the field. */
  sources: Source[];
};

const NODE_RADIUS = 1.5;
const LINK = 132;
const MOUSE_R = 230;

/**
 * Particle field behind the hero: nodes drift, link to nearby neighbours, and
 * push away from the pointer. When the ask bar cites sources, a few nodes light
 * up and draw bezier curves down to the answer panel.
 *
 * Neighbour search uses a spatial hash and batches links into three alpha
 * buckets, so a frame issues three strokes rather than one per line.
 */
export function useVectorField({ canvasRef, panelRef, labelsRef, sources }: Options) {
  const activeRef = useRef<ActiveNode[]>([]);
  const apiRef = useRef<{
    assignNodes: () => void;
    hideLabels: () => void;
  } | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const N = window.innerWidth < 760 ? 58 : 120;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const x = new Float32Array(N);
    const y = new Float32Array(N);
    const vx = new Float32Array(N);
    const vy = new Float32Array(N);
    const lit = new Float32Array(N);
    const mouse = { x: -9999, y: -9999 };
    let grad: CanvasGradient | null = null;

    const size = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      cv.width = Math.max(1, Math.floor(w * dpr));
      cv.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#7B68FA');
      grad.addColorStop(1, '#45D9EF');
    };
    size();

    for (let i = 0; i < N; i++) {
      x[i] = Math.random() * w;
      y[i] = Math.random() * h;
      vx[i] = (Math.random() - 0.5) * 0.16;
      vy[i] = (Math.random() - 0.5) * 0.16;
    }
    /** Home positions — the static path offsets from these instead of integrating. */
    const hx = Float32Array.from(x);
    const hy = Float32Array.from(y);

    const onResize = () => size();
    window.addEventListener('resize', onResize);

    const host = cv.parentElement;
    const onHostMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onHostLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    host?.addEventListener('pointermove', onHostMove, { passive: true });
    host?.addEventListener('pointerleave', onHostLeave);

    // Spatial hash keeps neighbour search near O(n).
    const cell = LINK;
    const buckets = new Map<string, number[]>();
    const key = (cx: number, cy: number) => `${cx},${cy}`;

    const drawFrame = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h);

      if (animate) {
        for (let i = 0; i < N; i++) {
          if (mouse.x > -999) {
            const dx = mouse.x - x[i];
            const dy = mouse.y - y[i];
            const d = Math.hypot(dx, dy);
            if (d < MOUSE_R && d > 1) {
              const f = (1 - d / MOUSE_R) * 0.014;
              vx[i] += (dx / d) * f;
              vy[i] += (dy / d) * f;
            }
          }
          vx[i] *= 0.992;
          vy[i] *= 0.992;
          const sp = Math.hypot(vx[i], vy[i]);
          // Keep nodes from stalling out or running away.
          if (sp < 0.05) {
            vx[i] += (Math.random() - 0.5) * 0.02;
            vy[i] += (Math.random() - 0.5) * 0.02;
          }
          if (sp > 0.55) {
            vx[i] *= 0.9;
            vy[i] *= 0.9;
          }
          x[i] += vx[i];
          y[i] += vy[i];
          if (x[i] < 0) {
            x[i] = 0;
            vx[i] *= -1;
          } else if (x[i] > w) {
            x[i] = w;
            vx[i] *= -1;
          }
          if (y[i] < 0) {
            y[i] = 0;
            vy[i] *= -1;
          } else if (y[i] > h) {
            y[i] = h;
            vy[i] *= -1;
          }
        }
      }

      buckets.clear();
      for (let i = 0; i < N; i++) {
        const k = key(Math.floor(x[i] / cell), Math.floor(y[i] / cell));
        let b = buckets.get(k);
        if (!b) {
          b = [];
          buckets.set(k, b);
        }
        b.push(i);
      }

      const paths: number[][] = [[], [], []];
      buckets.forEach((list, k) => {
        const p = k.split(',');
        const cx = +p[0];
        const cy = +p[1];
        for (let a = 0; a < list.length; a++) {
          const i = list[a];
          // Visit each neighbouring bucket once: forward column, and the row above/below.
          for (let ox = 0; ox <= 1; ox++) {
            for (let oy = ox ? -1 : 0; oy <= 1; oy++) {
              const nb = buckets.get(key(cx + ox, cy + oy));
              if (!nb) continue;
              for (let b = 0; b < nb.length; b++) {
                const j = nb[b];
                if (j <= i) continue;
                const d = Math.hypot(x[i] - x[j], y[i] - y[j]);
                if (d > LINK) continue;
                const t = 1 - d / LINK;
                paths[t > 0.66 ? 2 : t > 0.33 ? 1 : 0].push(i, j);
              }
            }
          }
        }
      });

      if (grad) ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      const alphas = [0.05, 0.11, 0.2];
      for (let b = 0; b < 3; b++) {
        const arr = paths[b];
        if (!arr.length) continue;
        ctx.globalAlpha = alphas[b];
        ctx.beginPath();
        for (let n = 0; n < arr.length; n += 2) {
          ctx.moveTo(x[arr[n]], y[arr[n]]);
          ctx.lineTo(x[arr[n + 1]], y[arr[n + 1]]);
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      for (let i = 0; i < N; i++) {
        if (lit[i]) continue;
        ctx.fillStyle = 'rgba(154,162,173,0.42)';
        ctx.beginPath();
        ctx.arc(x[i], y[i], NODE_RADIUS, 0, 6.2832);
        ctx.fill();
      }

      // Retrieval highlight: lit nodes, plus curves down to the answer panel.
      const active = activeRef.current;
      if (active.length) {
        const panel = panelRef.current;
        let px = w / 2;
        let py = h / 2;
        if (panel && panel.offsetHeight > 8) {
          const pr = panel.getBoundingClientRect();
          const cr = cv.getBoundingClientRect();
          px = pr.left + pr.width / 2 - cr.left;
          py = pr.top - cr.top;
        }
        const box = labelsRef.current;
        active.forEach((a, k) => {
          if (a.node == null) return;
          const nx = x[a.node];
          const ny = y[a.node];
          ctx.strokeStyle = 'rgba(123,104,250,0.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.bezierCurveTo(nx, (ny + py) / 2, px, (ny + py) / 2, px, py);
          ctx.stroke();
          ctx.fillStyle = '#7B68FA';
          ctx.beginPath();
          ctx.arc(nx, ny, 3.4, 0, 6.2832);
          ctx.fill();
          ctx.strokeStyle = 'rgba(123,104,250,0.35)';
          ctx.beginPath();
          ctx.arc(nx, ny, 9, 0, 6.2832);
          ctx.stroke();
          if (box) {
            const btn = box.querySelector<HTMLElement>(`[data-srclabel="${k}"]`);
            if (btn) {
              btn.style.display = 'flex';
              btn.style.transform = `translate(${nx + 14}px,${ny - 10}px)`;
            }
          }
        });
      }
    };

    // Static path: no autonomous drift, but the field still answers the pointer.
    const staticMode = reduced || window.innerWidth < 760;

    apiRef.current = {
      assignNodes: () => {
        const picks: number[] = [];
        const wanted = activeRef.current.length;
        // Prefer nodes inside the safe area so labels don't hang off the edge.
        let guard = 0;
        while (picks.length < wanted && guard++ < N * 40) {
          const i = Math.floor(Math.random() * N);
          if (
            picks.indexOf(i) === -1 &&
            x[i] > w * 0.08 &&
            x[i] < w * 0.92 &&
            y[i] > 60 &&
            y[i] < h - 60
          ) {
            picks.push(i);
          }
        }
        lit.fill(0);
        activeRef.current.forEach((a, k) => {
          a.node = picks[k] ?? null;
          if (a.node != null) lit[a.node] = 1;
        });
        // The animated path repaints on its own; the static one has to be told.
        if (staticMode) drawFrame(false);
      },
      hideLabels: () => {
        lit.fill(0);
        const box = labelsRef.current;
        box?.querySelectorAll<HTMLElement>('[data-srclabel]').forEach((b) => {
          b.style.display = 'none';
        });
        if (staticMode) drawFrame(false);
      },
    };

    let raf = 0;
    let io: IntersectionObserver | null = null;
    let queueNudge: (() => void) | null = null;

    if (staticMode) {
      drawFrame(false);
      if (canHover()) {
        let queued = false;
        const nudge = () => {
          queued = false;
          for (let i = 0; i < N; i++) {
            x[i] = hx[i];
            y[i] = hy[i];
            if (mouse.x > -999) {
              const dx = mouse.x - hx[i];
              const dy = mouse.y - hy[i];
              const d = Math.hypot(dx, dy);
              if (d < MOUSE_R && d > 1) {
                const pull = (1 - d / MOUSE_R) * 16;
                x[i] += (dx / d) * pull;
                y[i] += (dy / d) * pull;
              }
            }
          }
          drawFrame(false);
        };
        queueNudge = () => {
          if (!queued) {
            queued = true;
            requestAnimationFrame(nudge);
          }
        };
        host?.addEventListener('pointermove', queueNudge, { passive: true });
        host?.addEventListener('pointerleave', queueNudge, { passive: true });
      }
    } else {
      let running = true;
      let last = 0;
      const loop = (ts: number) => {
        raf = requestAnimationFrame(loop);
        if (!running || ts - last < 15) return;
        last = ts;
        drawFrame(true);
      };
      raf = requestAnimationFrame(loop);
      io = new IntersectionObserver((e) => {
        running = e[0].isIntersecting;
      });
      io.observe(cv);
    }

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener('resize', onResize);
      host?.removeEventListener('pointermove', onHostMove);
      host?.removeEventListener('pointerleave', onHostLeave);
      if (queueNudge) {
        host?.removeEventListener('pointermove', queueNudge);
        host?.removeEventListener('pointerleave', queueNudge);
      }
      apiRef.current = null;
    };
  }, [canvasRef, panelRef, labelsRef]);

  // Re-light the field whenever the cited sources change.
  useEffect(() => {
    if (sources.length) {
      activeRef.current = sources.map((s) => ({ ...s, node: null }));
      apiRef.current?.assignNodes();
    } else {
      activeRef.current = [];
      apiRef.current?.hideLabels();
    }
  }, [sources]);
}

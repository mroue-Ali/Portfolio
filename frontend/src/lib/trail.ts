/**
 * The pointer trail, as a plain module.
 *
 * Moving the pointer lays down a chain of nodes that carry the momentum of the
 * hand that made them, drift, link to their neighbours, and fade out. Every
 * number that shapes it comes from the CMS, so this file owns the conversion
 * from an editor's units — percentages, milliseconds, pixels — into the
 * simulation's, and nothing above it has to know the difference.
 *
 * It is not a component because two things run it: the site mounts it over the
 * whole viewport, and the CMS theme page runs a second copy inside a preview
 * box so an editor can see a setting before saving it. Sharing the module rather
 * than the look means the preview cannot drift from the real thing.
 *
 * Nodes are drawn from pre-rendered glow sprites composited with `lighter`, so
 * where two strands cross the colours add up into white — the brightness comes
 * out of the overlap rather than a lookup. On a light background that would
 * blow out, so the composite falls back to normal painting there.
 *
 * The loop only runs while something is alive; once the last node fades the rAF
 * is released, and the next pointer move starts it again.
 */

import type { ThemeTrail, TrailMotion, TrailParticle } from '../content';
import { luminance, rgb } from '../theme';

/** Ring-buffer capacity. The oldest node is overwritten once it is full. */
const MAX = 420;

export type TrailPalette = {
  bg: string;
  text: string;
  muted: string;
  accent: string;
  accentAlt: string;
};

export type TrailHandle = {
  /** Swap settings or palette without dropping the nodes already on screen. */
  update(settings: ThemeTrail, palette: TrailPalette): void;
  destroy(): void;
};

export type TrailOptions = {
  settings: ThemeTrail;
  palette: TrailPalette;
  /**
   * What the pointer is tracked against. `window` covers the whole page and
   * sizes to the viewport; an element scopes both to itself, which is what the
   * CMS preview wants.
   */
  host?: HTMLElement | Window;
  /**
   * Whether this visitor has asked their system for less motion.
   *
   * The environment fact only — what to *do* about it is `settings.reduced`,
   * which the CMS owns. Passing it in rather than reading the media query here
   * is what lets the CMS preview show an editor exactly what a visitor like them
   * would get, instead of always previewing the unreduced version.
   */
  reducedMotion?: boolean;
};

/** The options the CMS offers, and what each one means on screen. */
export const TRAIL_PARTICLES: readonly { value: TrailParticle; label: string; note: string }[] = [
  { value: 'dot', label: 'Dots', note: 'Soft glowing points. The default.' },
  { value: 'ring', label: 'Rings', note: 'Hollow circles — lighter, more technical.' },
  { value: 'square', label: 'Squares', note: 'Hard pixels. Reads as data.' },
  { value: 'diamond', label: 'Diamonds', note: 'Squares on their corner.' },
  { value: 'plus', label: 'Crosses', note: 'Small plus marks, like a chart grid.' },
  { value: 'spark', label: 'Sparks', note: 'Short streaks along the direction of travel.' },
];

export const TRAIL_MOTIONS: readonly { value: TrailMotion; label: string; note: string }[] = [
  { value: 'follow', label: 'With the cursor', note: 'Nodes carry the momentum of the hand.' },
  { value: 'opposite', label: 'Against the cursor', note: 'Thrown backwards along the path.' },
  { value: 'random', label: 'Random', note: 'A random direction, at the speed you moved.' },
  { value: 'outward', label: 'Outward', note: 'Blown away from the cursor in every direction.' },
  { value: 'inward', label: 'Inward', note: 'Drawn back towards the cursor as they fade.' },
  { value: 'still', label: 'Stay put', note: 'Dropped where the cursor was and left there.' },
];

export const REDUCED_MOTIONS = [
  {
    value: 'calm',
    label: 'Calm it down',
    note: 'Nodes still appear, link up and fade — they just do not travel, swirl or scatter.',
  },
  {
    value: 'full',
    label: 'Show it anyway',
    note: 'Everyone gets the trail exactly as set above.',
  },
  { value: 'off', label: 'Show nothing', note: 'No trail at all for those visitors.' },
] as const;

export const TRAIL_COLORS = [
  { value: 'theme', label: 'Both accents + text' },
  { value: 'accent', label: 'Accent only' },
  { value: 'accent-alt', label: 'Second accent only' },
  { value: 'white', label: 'Text colour only' },
  { value: 'muted', label: 'Muted only' },
] as const;

export const CURSOR_STYLES = [
  { value: 'reticle', label: 'Reticle', note: 'Four turning arcs around a core.' },
  { value: 'ring', label: 'Ring', note: 'One closed circle. Quiet.' },
  { value: 'dot', label: 'Dot', note: 'Just the core, no ring at all.' },
  { value: 'crosshair', label: 'Crosshair', note: 'Four ticks pointing inwards.' },
  { value: 'halo', label: 'Halo', note: 'A soft gradient bloom around the core.' },
  { value: 'native', label: 'System arrow', note: "Your OS cursor. Turns all of this off." },
] as const;

/** Which colours a node can be drawn in, as `"r,g,b"`. */
function tintsFor(settings: ThemeTrail, palette: TrailPalette): string[] {
  switch (settings.color) {
    case 'accent':
      return [rgb(palette.accent)];
    case 'accent-alt':
      return [rgb(palette.accentAlt)];
    case 'white':
      return [rgb(palette.text)];
    case 'muted':
      return [rgb(palette.muted)];
    default:
      return [rgb(palette.accent), rgb(palette.accentAlt), rgb(palette.text)];
  }
}

/** Radial glow: white core, tinted body, transparent edge. */
function sprite(tint: string, core: string) {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${core},1)`);
  grad.addColorStop(0.14, `rgba(${core},0.9)`);
  grad.addColorStop(0.32, `rgba(${tint},0.6)`);
  grad.addColorStop(0.62, `rgba(${tint},0.16)`);
  grad.addColorStop(1, `rgba(${tint},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/**
 * What a reduce-motion request actually costs, given the policy.
 *
 * `calm` is the middle setting and the default: presence without travel. The
 * other two are the honest extremes, and both are the editor's call to make.
 */
const isCalm = (settings: ThemeTrail, reducedMotion: boolean) =>
  reducedMotion && settings.reduced === 'calm';

const isSilenced = (settings: ThemeTrail, reducedMotion: boolean) =>
  reducedMotion && settings.reduced === 'off';

/**
 * The CMS's units, converted once.
 *
 * Percentages become the multipliers the integrator actually wants, and the
 * `calm` path zeroes everything that is motion rather than presence — which is
 * what reduced motion should mean here, rather than switching the feature off.
 */
function derive(settings: ThemeTrail, calm: boolean) {
  return {
    life: Math.max(0.1, settings.life / 1000),
    inherit: calm ? 0 : (settings.speed / 100) * 0.16,
    spread: calm ? 0 : 0.6,
    drag: calm ? 0.9 : 0.967,
    swirl: calm ? 0 : (settings.swirl / 100) * 0.19,
    repel: calm ? 0 : settings.repel / 100,
    // Repulsion needs a radius as well as a strength; one slider drives both,
    // so turning it down makes the bubble smaller and softer at once.
    repelRadius: 60 + (settings.repel / 100) * 160,
    spacing: Math.max(2, settings.density),
    linkDist: settings.links ? Math.max(0, settings.linkDistance) : 0,
    alpha: Math.min(1, Math.max(0, settings.opacity / 100)),
    radius: Math.max(1, settings.size),
    motion: settings.motion as TrailMotion,
    particle: settings.particle as TrailParticle,
    threads: settings.threads,
    burst: calm ? false : settings.burst,
  };
}

export function createTrail(canvas: HTMLCanvasElement, options: TrailOptions): TrailHandle {
  const ctx = canvas.getContext('2d');
  const host: HTMLElement | Window = options.host ?? window;
  const noop: TrailHandle = { update: () => {}, destroy: () => {} };
  if (!ctx) return noop;

  const reducedMotion = options.reducedMotion ?? false;

  let settings = options.settings;
  let palette = options.palette;
  let T = derive(settings, isCalm(settings, reducedMotion));
  let silenced = isSilenced(settings, reducedMotion);
  let tints = tintsFor(settings, palette);
  let glow = tints.map((tint) => sprite(tint, rgb(palette.text)));
  let additive = luminance(palette.bg) < 0.5;

  // ---- geometry ----

  let w = 0;
  let h = 0;
  /** Viewport offset of the drawing surface — zero when the host is the window. */
  let originX = 0;
  let originY = 0;

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (host === window) {
      // `clientWidth`, not `innerWidth`: a classic scrollbar is inside the one
      // and outside the other, and a canvas laid out with `inset: 0` gets the
      // narrower box. Using `innerWidth` stretched the backing store over it,
      // which slid the trail further from the cursor the further right it went.
      w = document.documentElement.clientWidth;
      h = document.documentElement.clientHeight;
      originX = 0;
      originY = 0;
    } else {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      originX = r.left;
      originY = r.top;
    }
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();

  // ---- state ----

  const px = new Float32Array(MAX);
  const py = new Float32Array(MAX);
  const vx = new Float32Array(MAX);
  const vy = new Float32Array(MAX);
  const life = new Float32Array(MAX);
  const rad = new Float32Array(MAX);
  const tint = new Uint8Array(MAX);
  let head = 0;
  let alive = 0;

  const mouse = { x: -9999, y: -9999, on: false };
  let lastX = 0;
  let lastY = 0;
  let carry = 0;
  let seeded = false;
  let raf = 0;
  let running = false;
  let last = 0;

  /** Launch velocity for a node, per the motion setting. */
  const launch = (dx: number, dy: number, out: { x: number; y: number }) => {
    const speed = Math.hypot(dx, dy) * T.inherit;
    switch (T.motion) {
      case 'opposite':
        out.x = -dx * T.inherit;
        out.y = -dy * T.inherit;
        return;
      case 'random': {
        const a = Math.random() * Math.PI * 2;
        out.x = Math.cos(a) * speed;
        out.y = Math.sin(a) * speed;
        return;
      }
      case 'outward': {
        // Nodes are born on the cursor, so "away from it" has no direction of
        // its own yet — a random radial gives the bloom, and the repel force
        // keeps pushing it out from there.
        const a = Math.random() * Math.PI * 2;
        out.x = Math.cos(a) * (speed + 0.6);
        out.y = Math.sin(a) * (speed + 0.6);
        return;
      }
      case 'inward':
        // Aimed back down the path, so they chase the cursor rather than trail it.
        out.x = -dx * T.inherit * 0.6;
        out.y = -dy * T.inherit * 0.6;
        return;
      case 'still':
        out.x = 0;
        out.y = 0;
        return;
      default:
        out.x = dx * T.inherit;
        out.y = dy * T.inherit;
    }
  };

  const vel = { x: 0, y: 0 };

  const spawn = (x: number, y: number, dx: number, dy: number, heat: number) => {
    const i = head;
    head = (head + 1) % MAX;
    px[i] = x;
    py[i] = y;
    launch(dx, dy, vel);
    const spread = T.spread * (0.9 + heat * 1.5);
    vx[i] = vel.x + (Math.random() - 0.5) * spread;
    vy[i] = vel.y + (Math.random() - 0.5) * spread;
    life[i] = 1;
    rad[i] = T.radius * (0.55 + Math.random() * 0.45 + heat * 0.55);
    tint[i] = (Math.random() * tints.length) | 0;
  };

  // ---- input ----

  const point = (e: PointerEvent) => ({ x: e.clientX - originX, y: e.clientY - originY });

  const onMove = (event: Event) => {
    const e = event as PointerEvent;
    const { x, y } = point(e);
    mouse.x = x;
    mouse.y = y;
    mouse.on = true;

    if (!seeded) {
      seeded = true;
      lastX = x;
      lastY = y;
    }

    const dx = x - lastX;
    const dy = y - lastY;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      // Speed sets how hot the trail runs: bigger, faster, wider nodes.
      const heat = Math.min(dist / 34, 1);
      carry += dist;
      // Walk the segment and drop nodes at even spacing, so a fast flick leaves
      // a chain rather than a clump at the endpoint.
      let step = 0;
      while (carry >= T.spacing && step < 24) {
        carry -= T.spacing;
        const t = Math.min(Math.max(1 - carry / dist, 0), 1);
        spawn(lastX + dx * t, lastY + dy * t, dx, dy, heat);
        step++;
      }
      if (carry > T.spacing) carry = T.spacing;
      lastX = x;
      lastY = y;
    }
    start();
  };

  const onDown = (event: Event) => {
    if (!T.burst) return;
    const e = event as PointerEvent;
    const { x, y } = point(e);
    for (let n = 0; n < 22; n++) {
      const a = (n / 22) * Math.PI * 2 + Math.random() * 0.3;
      const s = 28 + Math.random() * 32;
      spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 1);
    }
    start();
  };

  const onLeave = () => {
    mouse.on = false;
    mouse.x = -9999;
    mouse.y = -9999;
    seeded = false;
  };

  // ---- links ----

  const buckets = new Map<number, number[]>();
  const key = (cx: number, cy: number) => (cx + 4096) * 8192 + (cy + 4096);
  /** One list per tint, per distance band. */
  let links: number[][] = [];
  const bandAlpha = [0.07, 0.16, 0.32];

  const sizeLinkBuckets = () => {
    links = Array.from({ length: tints.length * 3 }, () => []);
  };
  sizeLinkBuckets();

  // ---- drawing ----

  /** Everything that is not the glow sprite is stroked or filled per node. */
  const drawMark = (i: number, r: number, alpha: number) => {
    const x = px[i];
    const y = py[i];
    const c = tints[tint[i]];
    ctx.globalAlpha = alpha;

    switch (T.particle) {
      case 'ring':
        ctx.strokeStyle = `rgb(${c})`;
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.62, 0, 6.2832);
        ctx.stroke();
        return;
      case 'square':
        ctx.fillStyle = `rgb(${c})`;
        ctx.fillRect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.9);
        return;
      case 'diamond':
        ctx.fillStyle = `rgb(${c})`;
        ctx.beginPath();
        ctx.moveTo(x, y - r * 0.62);
        ctx.lineTo(x + r * 0.62, y);
        ctx.lineTo(x, y + r * 0.62);
        ctx.lineTo(x - r * 0.62, y);
        ctx.closePath();
        ctx.fill();
        return;
      case 'plus':
        ctx.strokeStyle = `rgb(${c})`;
        ctx.lineWidth = Math.max(1, r * 0.18);
        ctx.beginPath();
        ctx.moveTo(x - r * 0.6, y);
        ctx.lineTo(x + r * 0.6, y);
        ctx.moveTo(x, y - r * 0.6);
        ctx.lineTo(x, y + r * 0.6);
        ctx.stroke();
        return;
      case 'spark': {
        // Along its own velocity, so a spark points where the node is going.
        const sp = Math.hypot(vx[i], vy[i]) || 1;
        const ux = (vx[i] / sp) * r;
        const uy = (vy[i] / sp) * r;
        ctx.strokeStyle = `rgb(${c})`;
        ctx.lineWidth = Math.max(1, r * 0.2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - ux, y - uy);
        ctx.lineTo(x + ux, y + uy);
        ctx.stroke();
        return;
      }
      default:
        ctx.drawImage(glow[tint[i]], x - r, y - r, r * 2, r * 2);
    }
  };

  const frame = (ts: number) => {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(ts - last, 40) : 16.7;
    last = ts;
    const k = dt / 16.7;
    const time = ts * 0.0004;

    ctx.clearRect(0, 0, w, h);

    // ---- integrate ----
    alive = 0;
    const drag = Math.pow(T.drag, k);
    // Inward is the one mode where the pointer pulls instead of pushes.
    const pull = T.motion === 'inward' ? -1 : 1;

    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) continue;

      if (T.swirl) {
        // A slow curl field: nodes wander instead of running straight.
        const a = Math.sin(py[i] * 0.008 + time) + Math.cos(px[i] * 0.008 - time * 1.3);
        vx[i] += Math.cos(a * Math.PI) * T.swirl * k;
        vy[i] += Math.sin(a * Math.PI) * T.swirl * k;
      }

      if (T.repel && mouse.on) {
        const dx = px[i] - mouse.x;
        const dy = py[i] - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < T.repelRadius && d > 0.5) {
          const f = (1 - d / T.repelRadius) * T.repel * 0.55 * k * pull;
          vx[i] += (dx / d) * f;
          vy[i] += (dy / d) * f;
        }
      }

      vx[i] *= drag;
      vy[i] *= drag;
      px[i] += vx[i] * k;
      py[i] += vy[i] * k;

      life[i] -= dt / 1000 / T.life;
      if (life[i] <= 0) {
        life[i] = 0;
        continue;
      }
      alive++;
    }

    if (additive) ctx.globalCompositeOperation = 'lighter';

    // ---- links ----
    if (T.linkDist > 0) {
      const cell = T.linkDist;
      buckets.clear();
      for (let i = 0; i < MAX; i++) {
        if (life[i] <= 0) continue;
        const kk = key(Math.floor(px[i] / cell), Math.floor(py[i] / cell));
        let b = buckets.get(kk);
        if (!b) {
          b = [];
          buckets.set(kk, b);
        }
        b.push(i);
      }
      for (let n = 0; n < links.length; n++) links[n].length = 0;

      buckets.forEach((list, kk) => {
        const cy = (kk % 8192) - 4096;
        const cx = Math.floor(kk / 8192) - 4096;
        for (let ai = 0; ai < list.length; ai++) {
          const i = list[ai];
          // Each neighbouring bucket is visited once: forward column, plus the
          // row above and below.
          for (let ox = 0; ox <= 1; ox++) {
            for (let oy = ox ? -1 : 0; oy <= 1; oy++) {
              const nb = buckets.get(key(cx + ox, cy + oy));
              if (!nb) continue;
              for (let bi = 0; bi < nb.length; bi++) {
                const j = nb[bi];
                if (j <= i) continue;
                const d = Math.hypot(px[i] - px[j], py[i] - py[j]);
                if (d > cell) continue;
                const near = 1 - d / cell;
                const band = near > 0.66 ? 2 : near > 0.33 ? 1 : 0;
                const pair = Math.round((tint[i] + tint[j]) / 2);
                links[pair * 3 + band].push(i, j);
              }
            }
          }
        }
      });

      // Batched into one stroke per tint-and-band, so a frame issues a handful
      // of draw calls rather than one per line.
      ctx.lineWidth = 1;
      ctx.lineCap = 'butt';
      for (let n = 0; n < links.length; n++) {
        const arr = links[n];
        if (!arr.length) continue;
        ctx.strokeStyle = `rgb(${tints[(n / 3) | 0]})`;
        ctx.globalAlpha = bandAlpha[n % 3] * T.alpha;
        ctx.beginPath();
        for (let m = 0; m < arr.length; m += 2) {
          ctx.moveTo(px[arr[m]], py[arr[m]]);
          ctx.lineTo(px[arr[m + 1]], py[arr[m + 1]]);
        }
        ctx.stroke();
      }
    }

    // Threads back to the pointer, so the chain reads as attached to the hand.
    if (T.threads && mouse.on) {
      ctx.strokeStyle = `rgb(${rgb(palette.text)})`;
      ctx.globalAlpha = 0.2 * T.alpha;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let drawn = 0;
      const reach = Math.max(120, T.linkDist * 1.6);
      for (let i = 0; i < MAX && drawn < 16; i++) {
        if (life[i] <= 0) continue;
        if (Math.hypot(px[i] - mouse.x, py[i] - mouse.y) > reach) continue;
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(px[i], py[i]);
        drawn++;
      }
      ctx.stroke();
    }

    // ---- nodes ----
    for (let i = 0; i < MAX; i++) {
      const l = life[i];
      if (l <= 0) continue;
      // Up over the first sliver of life, then down along a curve.
      const fade = l > 0.9 ? (1 - l) / 0.1 : l * l;
      drawMark(i, rad[i] * (0.45 + l * 0.55), fade * T.alpha);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (!alive) stop();
  };

  // Arrow functions, not declarations: a hoisted `function` is analysed as if it
  // could run before the null check on `ctx` above, which loses the narrowing.
  const start = () => {
    if (running || !settings.enabled || silenced) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, w, h);
  };

  const onResize = () => size();
  window.addEventListener('resize', onResize);
  // Scrolling moves an element host under the pointer without a resize.
  if (host !== window) window.addEventListener('scroll', onResize, { passive: true });
  host.addEventListener('pointermove', onMove, { passive: true });
  host.addEventListener('pointerdown', onDown, { passive: true });
  (host === window ? document : (host as HTMLElement)).addEventListener('pointerleave', onLeave);

  return {
    update(nextSettings, nextPalette) {
      const tintsChanged =
        nextSettings.color !== settings.color ||
        nextPalette.accent !== palette.accent ||
        nextPalette.accentAlt !== palette.accentAlt ||
        nextPalette.text !== palette.text ||
        nextPalette.muted !== palette.muted;

      settings = nextSettings;
      palette = nextPalette;
      T = derive(settings, isCalm(settings, reducedMotion));
      silenced = isSilenced(settings, reducedMotion);
      additive = luminance(palette.bg) < 0.5;

      if (tintsChanged) {
        tints = tintsFor(settings, palette);
        glow = tints.map((tint) => sprite(tint, rgb(palette.text)));
        sizeLinkBuckets();
        // Indices into the old tint list may not exist in the new one.
        for (let i = 0; i < MAX; i++) if (tint[i] >= tints.length) tint[i] = 0;
      }

      if (!settings.enabled || silenced) {
        for (let i = 0; i < MAX; i++) life[i] = 0;
        stop();
      }
      size();
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (host !== window) window.removeEventListener('scroll', onResize);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      (host === window ? document : (host as HTMLElement)).removeEventListener(
        'pointerleave',
        onLeave,
      );
    },
  };
}

import { useEffect, useRef } from 'react';
import { theme } from '../content';
import type { CursorStyle } from '../content';
import { canHover, prefersReducedMotion } from '../lib/motion';
import { color } from '../theme';
import { CursorShape } from './CursorShape';

/**
 * The site's pointer, in place of the system arrow: a hard core that tracks
 * exactly, inside a shape that lags behind it on a spring.
 *
 * The shape answers what is under it — it opens up over anything clickable and
 * collapses to a caret over a text field — so it carries the affordance the
 * arrow used to. Which shape, how big, and whether it turns all come from the
 * CMS; `native` switches the whole thing off and gives the arrow back.
 *
 * The native cursor is hidden by a rule in global.css keyed to an attribute this
 * component sets, so it returns on its own wherever this does not run: the CMS,
 * a touch device, or a theme that asked for it.
 */

type Mode = 0 | 1 | 2;
const DEFAULT: Mode = 0;
const INTERACTIVE: Mode = 1;
const TEXT: Mode = 2;

/** Only the styles with arcs have anything to turn. */
const canSpin = (style: CursorStyle) => style === 'reticle' || style === 'crosshair';

const SCALE: Record<Mode, number> = { 0: 1, 1: 1.85, 2: 0.42 };
/** Degrees per frame at 60fps. */
const SPIN: Record<Mode, number> = { 0: 0.22, 1: 1.15, 2: 0.22 };

export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const fill = useRef<SVGCircleElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const caret = useRef<HTMLDivElement>(null);

  const style = theme.cursor.style;
  const size = theme.cursor.size;

  useEffect(() => {
    if (!canHover() || style === 'native') return;
    const r = ring.current;
    const d = dot.current;
    const c = caret.current;
    if (!r || !d || !c) return;

    document.documentElement.dataset.nativeCursor = 'off';

    const spin = theme.cursor.spin && canSpin(style) && !prefersReducedMotion();
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let scale = 1;
    let target = 1;
    let angle = 0;
    let mode: Mode = DEFAULT;
    let press = 0;
    let raf = 0;

    const setMode = (next: Mode) => {
      if (next === mode) return;
      mode = next;
      target = SCALE[next];
      if (fill.current) fill.current.style.opacity = next === INTERACTIVE ? '1' : '0';
      c.style.opacity = next === TEXT ? '1' : '0';
      d.style.opacity = next === TEXT ? '0' : '1';
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      d.style.transform = `translate3d(${mx}px,${my}px,0)`;
      c.style.transform = `translate3d(${mx}px,${my}px,0)`;
      if (r.style.opacity !== '1') {
        r.style.opacity = '1';
        d.style.opacity = mode === TEXT ? '0' : '1';
      }

      const el = e.target as Element | null;
      if (el?.closest?.('input,textarea,[contenteditable="true"]')) setMode(TEXT);
      else if (el?.closest?.('a,button,[data-cursor],.tile')) setMode(INTERACTIVE);
      else setMode(DEFAULT);
    };

    const onDown = () => {
      press = 1;
    };
    const onUp = () => {
      press = 0;
    };
    const onLeave = () => {
      r.style.opacity = '0';
      d.style.opacity = '0';
      c.style.opacity = '0';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    const tick = () => {
      // The core is exact; the ring is a spring behind it, which is what makes
      // the pointer feel like an object rather than a texture.
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      const want = target * (press ? 0.82 : 1);
      scale += (want - scale) * 0.16;
      r.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0) scale(${scale.toFixed(3)})`;
      if (spin && svg.current) {
        angle = (angle + SPIN[mode]) % 360;
        svg.current.style.transform = `rotate(${angle.toFixed(1)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      delete document.documentElement.dataset.nativeCursor;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [style, size]);

  if (style === 'native') return null;

  /** The core scales with the ring so a 96px cursor is not led by a 5px dot. */
  const core = Math.max(4, Math.round(size * 0.14));

  return (
    <>
      <div
        ref={ring}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: size,
          height: size,
          margin: `${-size / 2}px 0 0 ${-size / 2}px`,
          zIndex: 95,
          pointerEvents: 'none',
          opacity: 0,
          willChange: 'transform',
        }}
      >
        <CursorShape style={style} size={size} svgRef={svg} fillRef={fill} />
      </div>

      <div
        ref={dot}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: core,
          height: core,
          margin: `${-core / 2}px 0 0 ${-core / 2}px`,
          background: color.text,
          borderRadius: '50%',
          zIndex: 96,
          pointerEvents: 'none',
          opacity: 0,
          willChange: 'transform',
        }}
      />

      {/* Shown in place of the core over text fields. */}
      <div
        ref={caret}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 1.5,
          height: 22,
          margin: '-11px 0 0 -0.75px',
          background: color.accentAlt,
          zIndex: 96,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.2s',
          willChange: 'transform',
        }}
      />
    </>
  );
}

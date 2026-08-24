import { useEffect, useRef } from 'react';
import { canHover, prefersReducedMotion } from '../lib/motion';

/**
 * Custom pointer: a dot that tracks exactly, and a ring that lags behind and
 * swells over anything interactive.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canHover() || prefersReducedMotion()) return;
    const r = ring.current;
    const d = dot.current;
    if (!r || !d) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let scale = 1;
    let target = 1;
    let raf = 0;

    r.style.opacity = '1';
    d.style.opacity = '1';

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      d.style.transform = `translate3d(${mx}px,${my}px,0)`;
      const el = e.target as Element | null;
      const over = el?.closest?.('a,button,[data-cursor],.tile');
      target = over ? 2.5 : 1;
      r.style.borderColor = over ? 'rgba(69,217,239,0.9)' : 'rgba(233,236,240,0.45)';
      r.style.backgroundColor = over ? 'rgba(123,104,250,0.14)' : 'transparent';
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const tick = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      scale += (target - scale) * 0.15;
      r.style.transform = `translate3d(${rx}px,${ry}px,0) scale(${scale})`;
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <>
      <div
        ref={ring}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 34,
          height: 34,
          margin: '-17px 0 0 -17px',
          border: '1px solid rgba(233,236,240,0.45)',
          borderRadius: '50%',
          zIndex: 95,
          pointerEvents: 'none',
          opacity: 0,
          willChange: 'transform',
        }}
      />
      <div
        ref={dot}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 5,
          height: 5,
          margin: '-2.5px 0 0 -2.5px',
          background: '#E9ECF0',
          borderRadius: '50%',
          zIndex: 96,
          pointerEvents: 'none',
          opacity: 0,
          willChange: 'transform',
        }}
      />
    </>
  );
}

import { useEffect, useRef } from 'react';
import { canHover, prefersReducedMotion } from '../lib/motion';
import { color } from '../theme';

const DOTS =
  'radial-gradient(#E9ECF0 1px, transparent 1px)';

const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)'/></svg>")`;

const layer = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
} as const;

/**
 * Fixed atmosphere behind the page: dot grid, film grain, two colour glows,
 * and a spotlight that follows the pointer and reveals a brighter grid under it.
 */
export function Backdrop() {
  const spotlight = useRef<HTMLDivElement>(null);
  const gridGlow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sp = spotlight.current;
    const gg = gridGlow.current;
    if (!sp || !gg) return;
    if (!canHover()) return;

    const maskAt = (px: number, py: number) =>
      `radial-gradient(circle 250px at ${px}px ${py}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0) 76%)`;

    // Reduced motion: a direct, un-eased response to input rather than motion of its own.
    if (prefersReducedMotion()) {
      const onMove = (e: PointerEvent) => {
        sp.style.transition = 'none';
        gg.style.transition = 'none';
        sp.style.opacity = '1';
        gg.style.opacity = '0.2';
        sp.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
        const m = maskAt(e.clientX, e.clientY);
        gg.style.maskImage = m;
        gg.style.webkitMaskImage = m;
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      return () => window.removeEventListener('pointermove', onMove);
    }

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let cx = mx;
    let cy = my;
    let on = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      on = true;
    };
    const onLeave = () => {
      on = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    const tick = () => {
      cx += (mx - cx) * 0.055;
      cy += (my - cy) * 0.055;
      sp.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      const mask = maskAt(Math.round(cx), Math.round(cy));
      gg.style.maskImage = mask;
      gg.style.webkitMaskImage = mask;
      if (on && sp.style.opacity !== '1') {
        sp.style.opacity = '1';
        gg.style.opacity = '0.2';
      }
      if (!on && sp.style.opacity !== '0') {
        sp.style.opacity = '0';
        gg.style.opacity = '0';
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          ...layer,
          zIndex: 1,
          opacity: 0.05,
          backgroundImage: DOTS,
          backgroundSize: '26px 26px',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          ...layer,
          zIndex: 2,
          opacity: 0.05,
          mixBlendMode: 'overlay',
          backgroundImage: NOISE,
        }}
      />
      <div
        ref={gridGlow}
        aria-hidden="true"
        style={{
          ...layer,
          zIndex: 1,
          opacity: 0,
          backgroundImage: DOTS,
          backgroundSize: '26px 26px',
          transition: 'opacity 0.5s',
        }}
      />
      <div
        ref={spotlight}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 860,
          height: 860,
          margin: '-430px 0 0 -430px',
          zIndex: 1,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.6s',
          background:
            'radial-gradient(circle at 50% 50%, rgba(123,104,250,0.15) 0%, rgba(69,217,239,0.055) 40%, rgba(0,0,0,0) 68%)',
          willChange: 'transform',
        }}
      />
      <div
        data-glow="a"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-22vw',
          left: '-14vw',
          width: '62vw',
          height: '62vw',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.1,
          filter: 'blur(90px)',
          background: `radial-gradient(circle at 50% 50%, ${color.violet} 0%, rgba(123,104,250,0) 68%)`,
        }}
      />
      <div
        data-glow="b"
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: '-26vw',
          right: '-16vw',
          width: '58vw',
          height: '58vw',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.09,
          filter: 'blur(90px)',
          background: `radial-gradient(circle at 50% 50%, ${color.cyan} 0%, rgba(69,217,239,0) 68%)`,
        }}
      />
    </>
  );
}

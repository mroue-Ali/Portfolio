import { color, rgb } from '../theme';

/** Built per render so a palette change moves the grid with it. */
const dots = (c: string) => `radial-gradient(${c} 1px, transparent 1px)`;

const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)'/></svg>")`;

const layer = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
} as const;

/**
 * Fixed atmosphere behind the page: dot grid, film grain, two colour glows.
 * Static by design — the pointer is answered by PointerField, which lays its
 * trail on the layer just above these and still behind the content.
 */
export function Backdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          ...layer,
          zIndex: 1,
          opacity: 0.05,
          backgroundImage: dots(color.text),
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
          background: `radial-gradient(circle at 50% 50%, ${color.accent} 0%, rgba(${rgb(color.accent)},0) 68%)`,
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
          background: `radial-gradient(circle at 50% 50%, ${color.accentAlt} 0%, rgba(${rgb(color.accentAlt)},0) 68%)`,
        }}
      />
    </>
  );
}

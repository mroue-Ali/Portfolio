const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)'/></svg>")`;

/**
 * Fixed atmosphere behind the page: film grain, nothing else.
 *
 * There used to be a dot grid and two blurred colour glows here as well. Both
 * are what a generated landing page reaches for first, and with the pointer
 * trail already giving the page its motion they added recognition rather than
 * depth. The grain stays because it is what keeps a flat ground from looking
 * like a default — `global.css` sets its blend and strength per tone, since
 * overlay on paper and overlay on ink are not the same amount of texture.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="grain"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        backgroundImage: NOISE,
      }}
    />
  );
}

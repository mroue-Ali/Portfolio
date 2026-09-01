import { useEffect, useRef } from 'react';
import { theme } from '../content';
import { canHover, prefersReducedMotion } from '../lib/motion';
import { createTrail } from '../lib/trail';
import { color } from '../theme';

/**
 * The pointer trail, over the whole page.
 *
 * All of the work is in `lib/trail.ts` — this mounts one canvas behind the
 * content, points the simulation at the window, and hands it the settings the
 * CMS saved. Fixed rather than in a section, so the trail crosses the site
 * instead of living inside one part of it.
 *
 * It sits above the backdrop's grain and glows but under every section, which
 * all render at z-index 10 over a transparent background: the trail reads as
 * part of the atmosphere and never washes over text.
 */
export function PointerField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    // Nothing to follow on a touch device, and nothing to switch off if the
    // editor already switched it off.
    if (!canHover() || !theme.trail.enabled) return;

    const trail = createTrail(cv, {
      settings: theme.trail,
      palette: color,
      host: window,
      reducedMotion: prefersReducedMotion(),
    });
    return () => trail.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
  );
}

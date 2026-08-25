import { useId, type Ref } from 'react';
import type { CursorStyle } from '../content';
import { color } from '../theme';

/**
 * The ring around the pointer, as an SVG.
 *
 * Its own component because it is drawn twice: once by `Cursor`, following the
 * mouse, and once per option in the CMS's theme page, where an editor needs to
 * see the shape before choosing it. The gradient id is per-instance, or six
 * previews on one page would all resolve to whichever `<defs>` rendered last.
 *
 * `dot` and `native` have no ring at all and render nothing — the core in
 * `Cursor` is the whole shape for one, and the system arrow is for the other.
 */
export function CursorShape({
  style,
  size,
  svgRef,
  fillRef,
}: {
  style: CursorStyle;
  size: number;
  /** Given the rotation transform by `Cursor`; absent in a static preview. */
  svgRef?: Ref<SVGSVGElement>;
  /** The wash that comes up over anything clickable. */
  fillRef?: Ref<SVGCircleElement>;
}) {
  const id = useId();
  const grad = `cursor-arc-${id}`;
  const bloom = `cursor-bloom-${id}`;

  if (style === 'dot' || style === 'native') return null;

  const c = size / 2;
  const r = c - 2.5;
  /** 2πr split into four arcs and four gaps. */
  const dash = 2 * Math.PI * r;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ display: 'block', willChange: 'transform' }}
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color.accent} />
          <stop offset="100%" stopColor={color.accentAlt} />
        </linearGradient>
        <radialGradient id={bloom}>
          <stop offset="0%" stopColor={color.accent} stopOpacity="0.5" />
          <stop offset="55%" stopColor={color.accentAlt} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color.accentAlt} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Comes up over anything clickable, under whatever the style draws. */}
      <circle
        ref={fillRef}
        cx={c}
        cy={c}
        r={r}
        fill={`url(#${bloom})`}
        style={{ opacity: 0, transition: 'opacity 0.25s' }}
      />

      {style === 'halo' ? (
        <circle cx={c} cy={c} r={r} fill={`url(#${bloom})`} />
      ) : style === 'crosshair' ? (
        // Four ticks pointing inwards, with the middle left open for the core.
        <g stroke={`url(#${grad})`} strokeWidth={1.4} strokeLinecap="round">
          <path d={`M${c} ${c - r} v${r * 0.42}`} />
          <path d={`M${c} ${c + r} v${-r * 0.42}`} />
          <path d={`M${c - r} ${c} h${r * 0.42}`} />
          <path d={`M${c + r} ${c} h${-r * 0.42}`} />
          <circle cx={c} cy={c} r={r} fill="none" strokeWidth={0.75} opacity={0.35} />
        </g>
      ) : style === 'ring' ? (
        <circle cx={c} cy={c} r={r} fill="none" stroke={`url(#${grad})`} strokeWidth={1.25} />
      ) : (
        // reticle — four arcs rather than a closed ring, so it reads as an
        // instrument rather than a bubble.
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#${grad})`}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeDasharray={`${dash / 4 - 8} 8`}
        />
      )}
    </svg>
  );
}

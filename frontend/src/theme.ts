/** Design tokens from "Ali Mroue Portfolio v2 Grey". */

export const color = {
  bg: '#15181D',
  surface: '#1E2228',
  border: '#2F353E',
  text: '#E9ECF0',
  muted: '#9AA2AD',
  violet: '#7B68FA',
  cyan: '#45D9EF',
} as const;

export const font = {
  display: "'Clash Display', sans-serif",
  body: "'Satoshi', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const gradient = {
  brand: `linear-gradient(135deg, ${color.violet}, ${color.cyan})`,
  /** Used for headline text fills, which start from the base text colour. */
  headline: `linear-gradient(135deg, ${color.text} 10%, ${color.violet} 55%, ${color.cyan} 100%)`,
} as const;

/** Clip a gradient to the glyphs of a text node. */
export const textGradient = (image: string) => ({
  background: image,
  WebkitBackgroundClip: 'text' as const,
  backgroundClip: 'text' as const,
  color: 'transparent',
});

export const ease = {
  out: 'cubic-bezier(0.16,1,0.3,1)',
  inOut: 'cubic-bezier(0.76,0,0.24,1)',
} as const;

/** Eyebrow / label type used above every section heading. */
export const monoLabel = {
  fontFamily: font.mono,
  fontSize: 12,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: color.muted,
};

export const sectionHeading = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 600,
  fontSize: 'clamp(34px, 4.6vw, 56px)',
  lineHeight: 1.02,
  letterSpacing: '-0.03em',
};

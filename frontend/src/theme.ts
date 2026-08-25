/**
 * The site's design tokens, filled from the CMS at load.
 *
 * `color` and `gradient` start as the bundled palette and are rewritten in place
 * by `applyTheme()` before the first render — the same trick `content/index.ts`
 * uses, and for the same reason: components hold these objects for the life of
 * the page, so replacing the binding would leave them reading a stale palette.
 *
 * `applyTheme()` also writes every colour to a CSS custom property, which is how
 * `styles/global.css` gets the palette. Between the two, nothing on the site
 * names a colour: it names a role, and the role is whatever the CMS says today.
 */

import { theme as themeContent } from './content';
import type { ThemeColors } from './content';

/** A palette an editor can pick in one click. */
export type Preset = {
  key: string;
  label: string;
  /** One line on what it is for, shown under the swatches in the CMS. */
  note: string;
  colors: ThemeColors;
};

/**
 * The shipped palettes.
 *
 * Each is built the same way, which is what keeps them all working: a near-black
 * background, a surface a few points lighter, a border that reads at a glance
 * without drawing the eye, near-white text, a muted around 55% luminance, and
 * two accents close enough on the wheel to gradient cleanly into each other.
 * Swap any of them in and every gradient, hover and glow on the site stays
 * balanced, because they all resolve through the same seven roles.
 *
 * All dark: the site's atmosphere — additive trail, glow layers, film grain —
 * is composited for a dark ground, and a light palette would need those reworked
 * rather than recoloured.
 */
export const PRESETS: readonly Preset[] = [
  {
    key: 'graphite-violet',
    label: 'Graphite Violet',
    note: 'The original. Cool graphite under violet and cyan.',
    colors: {
      bg: '#15181D',
      surface: '#1E2228',
      border: '#2F353E',
      text: '#E9ECF0',
      muted: '#9AA2AD',
      accent: '#7B68FA',
      accentAlt: '#45D9EF',
    },
  },
  {
    key: 'arctic-slate',
    label: 'Arctic Slate',
    note: 'Colder and bluer. Reads as engineering.',
    colors: {
      bg: '#0F1419',
      surface: '#171E26',
      border: '#263039',
      text: '#E8EEF4',
      muted: '#94A3B1',
      accent: '#38BDF8',
      accentAlt: '#818CF8',
    },
  },
  {
    key: 'deep-sea',
    label: 'Deep Sea',
    note: 'Teal on near-black green. Calm, technical.',
    colors: {
      bg: '#0C1418',
      surface: '#14212A',
      border: '#23353F',
      text: '#E4F1F5',
      muted: '#8FA6AF',
      accent: '#2ED3B7',
      accentAlt: '#4DA6FF',
    },
  },
  {
    key: 'royal-plum',
    label: 'Royal Plum',
    note: 'Purple through pink. The warmest of the cool sets.',
    colors: {
      bg: '#14101B',
      surface: '#1E1829',
      border: '#332A45',
      text: '#EFE9F7',
      muted: '#A197B4',
      accent: '#A855F7',
      accentAlt: '#F472B6',
    },
  },
  {
    key: 'midnight-ember',
    label: 'Midnight Ember',
    note: 'Warm charcoal under orange and amber.',
    colors: {
      bg: '#14100F',
      surface: '#1E1917',
      border: '#362E2A',
      text: '#F2ECE7',
      muted: '#A99C93',
      accent: '#FF7A45',
      accentAlt: '#FFC24B',
    },
  },
  {
    key: 'crimson-noir',
    label: 'Crimson Noir',
    note: 'Red into orange. The loudest set here.',
    colors: {
      bg: '#16100F',
      surface: '#201817',
      border: '#382A29',
      text: '#F3E9E8',
      muted: '#AC9A98',
      accent: '#F43F5E',
      accentAlt: '#FB923C',
    },
  },
  {
    key: 'forest-signal',
    label: 'Forest Signal',
    note: 'Green on green. Quiet until something highlights.',
    colors: {
      bg: '#101613',
      surface: '#18211C',
      border: '#28352D',
      text: '#E8F1EA',
      muted: '#98A79D',
      accent: '#4ADE80',
      accentAlt: '#A3E635',
    },
  },
  {
    key: 'sand-ink',
    label: 'Sand & Ink',
    note: 'Warm neutral with gold and sage. Editorial.',
    colors: {
      bg: '#15140F',
      surface: '#1F1D16',
      border: '#343125',
      text: '#F0EDE2',
      muted: '#A9A38F',
      accent: '#E8B84B',
      accentAlt: '#7FB77E',
    },
  },
  {
    key: 'monochrome',
    label: 'Monochrome',
    note: 'No hue at all. Everything carried by contrast.',
    colors: {
      bg: '#121212',
      surface: '#1B1B1B',
      border: '#2E2E2E',
      text: '#EDEDED',
      muted: '#9A9A9A',
      accent: '#FFFFFF',
      accentAlt: '#B8B8B8',
    },
  },
];

export const presetByKey = (key: string): Preset | undefined =>
  PRESETS.find((preset) => preset.key === key);

/**
 * The live palette. Mutated by `applyTheme`, never reassigned — see the module
 * note. Seeded from the bundled theme so a component importing it at module
 * scope has real colours even if the API never answers.
 */
export const color: ThemeColors = { ...themeContent.colors };

/** `"123,104,250"` — for the `rgba()` the canvas and the glow layers build. */
export const rgb = (hex: string): string => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const n = parseInt(full.slice(0, 6), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/** Perceived lightness 0-1, for the handful of decisions that turn on it. */
export const luminance = (hex: string): number => {
  const [r, g, b] = rgb(hex).split(',').map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

export const font = {
  display: "'Clash Display', sans-serif",
  body: "'Satoshi', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

/** Filled by `applyTheme`, which is also the only place the recipe lives. */
export const gradient = {
  brand: '',
  /** Used for headline text fills, which start from the base text colour. */
  headline: '',
};

const brandGradient = (c: ThemeColors) => `linear-gradient(135deg, ${c.accent}, ${c.accentAlt})`;

const headlineGradient = (c: ThemeColors) =>
  `linear-gradient(135deg, ${c.text} 10%, ${c.accent} 55%, ${c.accentAlt} 100%)`;

/**
 * Publishes a palette to the module exports and to the document.
 *
 * Called once from `main.tsx` after the content has landed and before React
 * renders, and again by the CMS's live preview — which is why it takes an
 * argument rather than reading the module it usually gets its answer from.
 */
export function applyTheme(colors: ThemeColors = themeContent.colors) {
  Object.assign(color, colors);
  gradient.brand = brandGradient(colors);
  gradient.headline = headlineGradient(colors);

  const root = document.documentElement.style;
  root.setProperty('--c-bg', colors.bg);
  root.setProperty('--c-surface', colors.surface);
  root.setProperty('--c-border', colors.border);
  root.setProperty('--c-text', colors.text);
  root.setProperty('--c-muted', colors.muted);
  root.setProperty('--c-accent', colors.accent);
  root.setProperty('--c-accent-alt', colors.accentAlt);

  // Channel triplets, so a stylesheet can build its own alpha without knowing
  // the hex — `rgba(var(--c-accent-rgb), 0.35)`.
  root.setProperty('--c-bg-rgb', rgb(colors.bg));
  root.setProperty('--c-text-rgb', rgb(colors.text));
  root.setProperty('--c-accent-rgb', rgb(colors.accent));
  root.setProperty('--c-accent-alt-rgb', rgb(colors.accentAlt));

  root.setProperty('--g-brand', gradient.brand);
}

// The module's own exports have to be valid before anything imports them, and
// `applyTheme` is what makes the gradients valid. Running it here costs one pass
// over an object and means no module has to remember to call it first.
gradient.brand = brandGradient(color);
gradient.headline = headlineGradient(color);

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

/**
 * Eyebrow / label type used above every section heading.
 *
 * The colour is the custom property rather than `color.muted`, because this
 * object is built once at module load — before `applyTheme` has run — and a hex
 * copied out here would never hear about a palette change. Anything evaluated at
 * module scope has to go through `var()` for the same reason.
 */
export const monoLabel = {
  fontFamily: font.mono,
  fontSize: 12,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: 'var(--c-muted)',
};

export const sectionHeading = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 600,
  fontSize: 'clamp(34px, 4.6vw, 56px)',
  lineHeight: 1.02,
  letterSpacing: '-0.03em',
};

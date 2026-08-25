/**
 * The shapes every section is rendered from.
 *
 * These are the contract between the site and the backend: `GET /api/content`
 * returns exactly `SiteContent`, and `defaults.ts` satisfies the same types
 * offline. A component never knows which one it got.
 */

/**
 * A row's database id.
 *
 * Optional everywhere it appears: content from `GET /api/content` carries one,
 * the bundled copy in `defaults.ts` does not. Inline editing needs it to know
 * which row to patch, and stays switched off for anything without one — which
 * is exactly right, since offline copy has nothing to save to.
 */
export type RowId = number;

export type NavItem = {
  /** The anchor slug the link scrolls to. */
  id: string;
  /** Database row id — present only on content from the API. See `Editable`. */
  rowId?: number;
  label: string;
  href: string;
};

export type StackTile = {
  id?: RowId;
  name: string;
  /** simple-icons slug; also the key into ICON_PATHS for the offline fallback. */
  icon: string;
  /** Brand colour revealed on hover. */
  color: string;
  /** Where it was used. Kept as data; not rendered on the tile. */
  where: string;
};

export type StackGroup = { id?: RowId; name: string; tiles: StackTile[]; pills: string[] };

export type Project = {
  id?: RowId;
  number: string;
  title: string;
  summary: string;
  points: string[];
  tags: string[];
  /**
   * Screenshot under /public/projects. The files there now are generated
   * placeholders — swap in a real capture (~16:10, 1600x1000+) and update the
   * extension here. A missing file leaves the empty frame rather than breaking.
   */
  image: string;
  /** Where the card links to. TODO: swap in the real repo / case-study URLs. */
  link: string;
  /** Wording for the card's affordance. */
  linkLabel: string;
};

export type Role = { id?: RowId; period: string; title: string; body: string };

export type Stat = { id?: RowId; value: number; suffix: string; label: string };

/** A canned answer for the ask bar, matched on keywords. */
export type Answer = {
  /** Lowercase substrings matched against the question. */
  keywords: string[];
  question: string;
  answer: string;
};

export type Profile = {
  name: string;
  availability: string;
  role: string;
  /** Cycled by the rolling headline. */
  specialities: string[];
  intro: string;
  email: string;
  phone: string;
  phoneHref: string;
  linkedin: string;
  github: string;
};

export type AskConfig = {
  placeholder: string;
  /** Questions offered as chips — indices into `answers`. */
  chipIndices: number[];
  /** Questions allowed per session before the bar locks. */
  limit: number;
  fallback: string;
};

export type AboutContent = {
  eyebrow: string;
  heading: string;
  portraitPlaceholder: string;
  /** Set once there is a real portrait; empty keeps the placeholder frame. */
  portraitImage?: string;
  paragraphs: string[];
  stats: Stat[];
};

export type StackContent = { eyebrow: string; heading: string; groups: StackGroup[] };

export type ProjectsContent = { eyebrow: string; heading: string; items: Project[] };

/** A line under the timeline: education, languages. */
export type Footnote = { id?: RowId; text: string };

export type ExperienceContent = {
  eyebrow: string;
  heading: string;
  roles: Role[];
  footnotes: Footnote[];
};

export type ContactContent = {
  eyebrow: string;
  heading: string;
  cta: string;
  colophon: string;
  place: string;
};

/**
 * The seven colour roles everything on the site is drawn from.
 *
 * Every surface, border and gradient resolves to one of these, which is what
 * makes a palette swap a palette swap rather than a redesign: `theme.ts` writes
 * them to CSS custom properties, and nothing downstream names a colour.
 */
export type ThemeColors = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  /** The two brand colours every gradient is mixed from. */
  accent: string;
  accentAlt: string;
};

/** What the pointer is drawn as. `native` gives the system arrow back. */
export type CursorStyle = 'reticle' | 'ring' | 'dot' | 'crosshair' | 'halo' | 'native';

export type ThemeCursor = {
  style: CursorStyle;
  /** Outer diameter in pixels. */
  size: number;
  /** Whether the arcs turn. Ignored by styles that have none. */
  spin: boolean;
};

/** The mark each trail node is drawn as. */
export type TrailParticle = 'dot' | 'ring' | 'square' | 'spark' | 'plus' | 'diamond';

/** Which way a node leaves the cursor. */
export type TrailMotion = 'follow' | 'opposite' | 'random' | 'outward' | 'inward' | 'still';

/** How the trail answers `prefers-reduced-motion: reduce`. */
export type ReducedMotion = 'calm' | 'full' | 'off';

/** Which of the theme's colours the trail is drawn in. */
export type TrailColor = 'theme' | 'accent' | 'accent-alt' | 'white' | 'muted';

/**
 * Every knob on the pointer trail, in the units the CMS stores them in:
 * percentages 0-100, durations in milliseconds, distances in pixels.
 * `lib/trail.ts` converts them to the simulation's units in one place.
 */
export type ThemeTrail = {
  enabled: boolean;
  particle: TrailParticle;
  links: boolean;
  linkDistance: number;
  /** Lines from the live pointer back to the nodes nearest it. */
  threads: boolean;
  motion: TrailMotion;
  /** Share of the pointer's speed a node launches with, as a percentage. */
  speed: number;
  /** Milliseconds from spawn to gone. */
  life: number;
  /** Ceiling on how bright the trail draws, as a percentage. */
  opacity: number;
  /** Base node radius in pixels, before speed and age scale it. */
  size: number;
  /** Pixels of pointer travel between two nodes. Lower is denser. */
  density: number;
  color: TrailColor;
  /** Strength of the curl field that makes nodes wander, as a percentage. */
  swirl: number;
  /** How hard the pointer pushes nodes out of its way, as a percentage. */
  repel: number;
  /** Whether a click throws a ring of nodes outwards. */
  burst: boolean;
  /**
   * What a visitor who has asked their system for less motion sees.
   * `calm` keeps the nodes and takes the travel out, `full` ignores the request,
   * `off` shows them nothing.
   */
  reduced: ReducedMotion;
};

export type ThemeContent = {
  /** Which shipped palette the colours came from; "custom" once edited. */
  preset: string;
  colors: ThemeColors;
  cursor: ThemeCursor;
  trail: ThemeTrail;
};

/** The whole site in one response — the body of `GET /api/content`. */
export type SiteContent = {
  theme: ThemeContent;
  profile: Profile;
  nav: NavItem[];
  ask: AskConfig;
  answers: Answer[];
  about: AboutContent;
  stack: StackContent;
  projects: ProjectsContent;
  experience: ExperienceContent;
  contact: ContactContent;
};

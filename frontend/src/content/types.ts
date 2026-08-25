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

/** The whole site in one response — the body of `GET /api/content`. */
export type SiteContent = {
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

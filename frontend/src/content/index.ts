/**
 * Every piece of copy on the site, served from the content API.
 *
 * The exports below start as the bundled copy in `defaults.ts` and are filled
 * in from `GET /api/content` by `loadContent()`, which `main.tsx` awaits before
 * the first render. Components import these names exactly as before and never
 * learn where the text came from.
 *
 * Hydration mutates the exported objects and arrays in place rather than
 * reassigning them: a module-level `const` is a live binding components hold for
 * the life of the page, so replacing it would leave them reading stale data.
 * Because it happens before the first paint, nothing re-renders and GSAP still
 * measures a settled DOM.
 *
 * Anything the API omits or malforms keeps its bundled value, so a backend that
 * is down or half-migrated degrades to the built-in copy instead of a blank page.
 */

import * as defaults from './defaults';
import type {
  AboutContent,
  Answer,
  AskConfig,
  ContactContent,
  ExperienceContent,
  NavItem,
  Profile,
  ProjectsContent,
  SiteContent,
  StackContent,
  ThemeContent,
} from './types';

export type {
  AboutContent,
  Answer,
  AskConfig,
  ContactContent,
  ExperienceContent,
  Footnote,
  NavItem,
  Profile,
  Project,
  ProjectsContent,
  Role,
  SiteContent,
  StackContent,
  StackGroup,
  StackTile,
  Stat,
  ThemeColors,
  ThemeContent,
  ThemeCursor,
  ThemeTrail,
  CursorStyle,
  ReducedMotion,
  TrailColor,
  TrailMotion,
  TrailParticle,
} from './types';

/** Cloned so the fallback in `defaults` stays pristine after hydration. */
const clone = <T,>(value: T): T => structuredClone(value);

/**
 * Colours, cursor and trail. Read by `theme.ts` (which writes the CSS custom
 * properties), by `Cursor`, and by `lib/trail.ts` — all of them after
 * `loadContent()` has run, so they see the CMS's values and not these.
 */
export const theme: ThemeContent = clone(defaults.theme);
export const profile: Profile = clone(defaults.profile);
export const nav: NavItem[] = clone(defaults.nav);
export const ask: AskConfig = clone(defaults.ask);
export const answers: Answer[] = clone(defaults.answers);
export const about: AboutContent = clone(defaults.about);
export const stack: StackContent = clone(defaults.stack);
export const projects: ProjectsContent = clone(defaults.projects);
export const experience: ExperienceContent = clone(defaults.experience);
export const contact: ContactContent = clone(defaults.contact);

/**
 * Where the rendered copy came from. `main.tsx` logs it in dev; nothing renders
 * differently either way.
 */
export type ContentSource = 'api' | 'fallback';
export let contentSource: ContentSource = 'fallback';

/**
 * API origin. Left unset, requests go to `/api/...` on the same origin — which
 * the Vite dev server proxies to the backend, and production serves behind one
 * domain. Set VITE_API_URL when the API lives somewhere else.
 */
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

export const CONTENT_ENDPOINT = `${API_BASE}/api/content`;
export const ASK_ENDPOINT = `${API_BASE}/api/ask`;

/**
 * Resolves an image path for an `<img src>`.
 *
 * Two kinds of path end up in the content: `/projects/thing.svg`, which ships in
 * `public/` and belongs to the site's own origin, and `/media/thing.png`, which
 * was uploaded and belongs to the API's. They are identical in development —
 * Vite proxies `/media` — and differ only when the API is on its own domain,
 * which is exactly when getting this wrong would break every uploaded image.
 */
export const assetUrl = (path: string | undefined): string => {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  return path.startsWith('/media/') ? `${API_BASE}${path}` : path;
};

const fill = <T extends object>(target: T, next: T | undefined) => {
  if (next && typeof next === 'object') Object.assign(target, next);
};

const fillList = <T,>(target: T[], next: T[] | undefined) => {
  if (!Array.isArray(next) || next.length === 0) return;
  target.length = 0;
  target.push(...next);
};

function hydrate(data: SiteContent) {
  // Nested one level, so a malformed group falls back on its own rather than
  // taking the other two down with it.
  if (data.theme && typeof data.theme === 'object') {
    if (typeof data.theme.preset === 'string') theme.preset = data.theme.preset;
    fill(theme.colors, data.theme.colors);
    fill(theme.cursor, data.theme.cursor);
    fill(theme.trail, data.theme.trail);
  }
  fill(profile, data.profile);
  fillList(nav, data.nav);
  fill(ask, data.ask);
  fillList(answers, data.answers);
  fill(about, data.about);
  fill(stack, data.stack);
  fill(projects, data.projects);
  fill(experience, data.experience);
  fill(contact, data.contact);
}

/** Enough of a shape check to reject an error page or a half-seeded database. */
const looksLikeContent = (data: unknown): data is SiteContent =>
  typeof data === 'object' &&
  data !== null &&
  typeof (data as SiteContent).profile?.name === 'string' &&
  Array.isArray((data as SiteContent).nav);

/**
 * Loads the site's copy from the API, and reports which source won.
 *
 * Never rejects, and never blocks the page for long: on timeout, network error,
 * bad status, or an unrecognisable body the bundled copy is left in place.
 *
 * `fresh` skips the HTTP cache. The endpoint sends `max-age=60`, which is right
 * for visitors and wrong for the second after an edit — without it the CMS would
 * save successfully and the page would keep showing the old text for a minute.
 */
export async function loadContent({
  timeoutMs = 3000,
  fresh = false,
}: { timeoutMs?: number; fresh?: boolean } = {}): Promise<ContentSource> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(CONTENT_ENDPOINT, {
      headers: { accept: 'application/json' },
      cache: fresh ? 'no-store' : 'default',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return 'fallback';

    const data: unknown = await res.json();
    if (!looksLikeContent(data)) return 'fallback';

    hydrate(data);
    contentSource = 'api';
    return 'api';
  } catch {
    return 'fallback';
  }
}

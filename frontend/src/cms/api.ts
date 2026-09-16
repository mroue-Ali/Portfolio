/**
 * The one place the CMS talks to the backend.
 *
 * Every call goes through `request`, which attaches the session token, turns a
 * non-2xx response into a thrown `ApiError` carrying the server's own message,
 * and — on a 401 — clears the session so the app falls back to the sign-in
 * screen instead of rendering empty forms. The admin API is uniform (six routes
 * per table), so `collection()` gives a fully typed client for any resource in
 * one line, and `singleton()` does the same for the one-row tables.
 */

import { API_BASE } from '../content';

const TOKEN_KEY = 'portfolio.cms.token';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Fired when the server rejects our token — expired, revoked, or the account
 * was deactivated mid-session. `session.ts` listens and signs out.
 */
export const UNAUTHORIZED_EVENT = 'cms:unauthorized';

/** FastAPI puts the message in `detail`, as a string or a validation list. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const detail = body?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '';
          return field ? `${field}: ${d.msg}` : d.msg;
        })
        .join('; ');
    }
  } catch {
    /* not JSON — fall through to the status line */
  }
  return `${res.status} ${res.statusText}`;
}

export async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const token = auth ? getToken() : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      accept: 'application/json',
      // FormData writes its own content-type, boundary and all.
      ...(rest.body && !(rest.body instanceof FormData)
        ? { 'content-type': 'application/json' }
        : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (res.status === 401 && auth) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

/** Every row the admin API returns carries at least these. */
export type Row = { id: number; position?: number };

export interface Collection<T extends Row, TCreate = Partial<T>> {
  list(): Promise<T[]>;
  get(id: number): Promise<T>;
  create(payload: TCreate): Promise<T>;
  update(id: number, payload: Partial<T>): Promise<T>;
  remove(id: number): Promise<void>;
  /** Positions in one request, so a reorder can't half-apply. */
  reorder(items: { id: number; position: number }[]): Promise<T[]>;
}

export function collection<T extends Row, TCreate = Partial<T>>(
  path: string,
): Collection<T, TCreate> {
  const base = `/api/admin/${path}`;
  return {
    list: () => send<T[]>('GET', base),
    get: (id) => send<T>('GET', `${base}/${id}`),
    create: (payload) => send<T>('POST', base, payload),
    update: (id, payload) => send<T>('PATCH', `${base}/${id}`, payload),
    remove: (id) => send<void>('DELETE', `${base}/${id}`),
    reorder: (items) => send<T[]>('PUT', `${base}/reorder`, { items }),
  };
}

export interface Singleton<T> {
  get(): Promise<T>;
  update(payload: Partial<T>): Promise<T>;
}

export function singleton<T>(path: string): Singleton<T> {
  const base = `/api/admin/${path}`;
  return {
    get: () => send<T>('GET', base),
    update: (payload) => send<T>('PATCH', base, payload),
  };
}

/** Sections are keyed by their anchor slug rather than a numeric id. */
export const sections = {
  list: () => send<SectionRow[]>('GET', '/api/admin/sections'),
  update: (key: string, payload: Partial<SectionRow>) =>
    send<SectionRow>('PATCH', `/api/admin/sections/${key}`, payload),
};

// --------------------------------------------------------------------------- //
// Row shapes — snake_case, exactly as the tables are.
// --------------------------------------------------------------------------- //

export type AiSettingsRow = {
  id: number;
  mode: 'hybrid' | 'ai' | 'keyword';
  /** Empty means the provider default in `backend/app/ai/llm.py`. */
  model: string;
  router_model: string;
  system_prompt: string;
  user_prompt: string;
  log_questions: boolean;
  /** From backend/.env, read-only here. */
  provider: string;
  provider_ready: boolean;
  /** The shipped prompts, for the reset buttons. */
  default_system_prompt: string;
  default_user_prompt: string;
};

export type AiModel = { id: string; label: string; free: boolean };

export type AskLogRow = {
  id: number;
  question: string;
  answer: string;
  source: 'model' | 'written';
  collections: string[];
  model: string;
  ms: number;
  error: string;
  streamed: boolean;
  created_at: string;
};

export type AskLogPage = { items: AskLogRow[]; total: number; answered_by_model: number };

export type SectionRow = {
  id: number;
  key: string;
  eyebrow: string;
  heading: string;
  position: number;
};

export type ProfileRow = {
  id: number;
  name: string;
  role: string;
  availability: string;
  intro: string;
  specialities: string[];
  email: string;
  phone: string;
  phone_href: string;
  linkedin: string;
  github: string;
};

export type AboutRow = {
  id: number;
  portrait_placeholder: string;
  portrait_image: string;
  paragraphs: string[];
};

/** The projects section itself — how it renders, not what is in it. */
export type ProjectsContentRow = {
  id: number;
  layout: 'showcase' | 'list';
};

export type ContactRow = {
  id: number;
  cta: string;
  colophon: string;
  place: string;
};

/**
 * The theme table, column for column.
 *
 * The site reads a grouped version of this from `GET /api/content`; the CMS
 * edits the flat row, which is what the singleton endpoint speaks.
 */
export type ThemeRow = {
  id: number;
  preset: string;

  color_bg: string;
  color_surface: string;
  color_border: string;
  color_text: string;
  color_muted: string;
  color_accent: string;
  color_accent_alt: string;

  cursor_style: 'reticle' | 'ring' | 'dot' | 'crosshair' | 'halo' | 'native';
  cursor_size: number;
  cursor_spin: boolean;

  trail_enabled: boolean;
  trail_particle: 'dot' | 'ring' | 'square' | 'spark' | 'plus' | 'diamond';
  trail_links: boolean;
  trail_link_distance: number;
  trail_threads: boolean;
  trail_motion: 'follow' | 'opposite' | 'random' | 'outward' | 'inward' | 'still';
  trail_speed: number;
  trail_life: number;
  trail_opacity: number;
  trail_size: number;
  trail_density: number;
  trail_color: 'theme' | 'accent' | 'accent-alt' | 'white' | 'muted';
  trail_swirl: number;
  trail_repel: number;
  trail_burst: boolean;
};

/**
 * A saved pointer setup: the `cursor_*` and `trail_*` half of `ThemeRow`, under
 * a name. Not the palette — colours have their own presets.
 */
export type ThemeTemplateRow = {
  id: number;
  name: string;
  note: string;
  settings: Partial<ThemeRow>;
  position: number;
};

export type AskRow = {
  id: number;
  placeholder: string;
  question_limit: number;
  fallback: string;
};

export type NavRow = {
  id: number;
  slug: string;
  label: string;
  href: string;
  visible: boolean;
  position: number;
};

export type StatRow = {
  id: number;
  value: number;
  suffix: string;
  label: string;
  position: number;
};

export type StackTileRow = {
  id: number;
  group_id: number;
  name: string;
  icon: string;
  color: string;
  where_used: string;
  position: number;
};

export type StackGroupRow = {
  id: number;
  name: string;
  pills: string[];
  position: number;
  tiles: StackTileRow[];
};

export type ProjectRow = {
  id: number;
  number: string;
  title: string;
  summary: string;
  points: string[];
  tags: string[];
  image: string;
  link: string;
  link_label: string;
  published: boolean;
  position: number;
};

export type RoleRow = {
  id: number;
  period: string;
  title: string;
  body: string;
  position: number;
};

export type FootnoteRow = { id: number; text: string; position: number };


export type AnswerRow = {
  id: number;
  question: string;
  answer: string;
  keywords: string[];
  is_chip: boolean;
  published: boolean;
  position: number;
};

export type UploadRow = {
  filename: string;
  /** What goes in the content column. */
  url: string;
  size: number;
  content_type: string;
  uploaded_at: string;
};

export type UserRow = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  is_active: boolean;
  last_login_at: string | null;
};

// --------------------------------------------------------------------------- //
// Clients
// --------------------------------------------------------------------------- //

export const api = {
  profile: singleton<ProfileRow>('profile'),
  about: singleton<AboutRow>('about'),
  projectsContent: singleton<ProjectsContentRow>('projects-content'),
  contact: singleton<ContactRow>('contact'),
  ask: singleton<AskRow>('ask'),
  theme: singleton<ThemeRow>('theme'),
  themeTemplates: collection<ThemeTemplateRow>('theme-templates'),
  ai: {
    get: () => send<AiSettingsRow>('GET', '/api/admin/ai'),
    update: (payload: Partial<AiSettingsRow>) =>
      send<AiSettingsRow>('PATCH', '/api/admin/ai', payload),
    /** Asked live, so a model retired upstream is a refresh rather than a deploy. */
    models: () => send<AiModel[]>('GET', '/api/admin/ai/models'),
    logs: (params: { limit?: number; offset?: number; source?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.limit != null) q.set('limit', String(params.limit));
      if (params.offset != null) q.set('offset', String(params.offset));
      if (params.source) q.set('source', params.source);
      const qs = q.toString();
      return send<AskLogPage>('GET', `/api/admin/ai/logs${qs ? `?${qs}` : ''}`);
    },
    clearLogs: () => send<void>('DELETE', '/api/admin/ai/logs'),
    deleteLog: (id: number) => send<void>('DELETE', `/api/admin/ai/logs/${id}`),
  },
  sections,
  nav: collection<NavRow>('nav'),
  stats: collection<StatRow>('stats'),
  stackGroups: collection<StackGroupRow>('stack-groups'),
  stackTiles: collection<StackTileRow>('stack-tiles'),
  projects: collection<ProjectRow>('projects'),
  roles: collection<RoleRow>('roles'),
  footnotes: collection<FootnoteRow>('footnotes'),
  answers: collection<AnswerRow>('answers'),

  /**
   * Images. `upload` sends multipart, so it sets no content-type of its own —
   * the browser has to write the boundary, and a hand-set header would break it.
   */
  uploads: {
    list: () => send<UploadRow[]>('GET', '/api/admin/uploads'),
    upload: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return request<UploadRow>('/api/admin/uploads', { method: 'POST', body });
    },
    remove: (filename: string) =>
      send<void>('DELETE', `/api/admin/uploads/${encodeURIComponent(filename)}`),
  },

  users: {
    list: () => send<UserRow[]>('GET', '/api/auth/users'),
    create: (payload: Partial<UserRow> & { password: string }) =>
      send<UserRow>('POST', '/api/auth/users', payload),
    update: (id: number, payload: Partial<UserRow> & { password?: string }) =>
      send<UserRow>('PATCH', `/api/auth/users/${id}`, payload),
    remove: (id: number) => send<void>('DELETE', `/api/auth/users/${id}`),
  },
};

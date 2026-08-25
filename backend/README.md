# backend

FastAPI + SQLAlchemy over MySQL. Three jobs: serve the site's content in the
exact shape the frontend already expects, expose CRUD so a CMS can edit it, and
sign people into that CMS.

```bash
cd backend
venv/Scripts/activate                       # Windows; source venv/bin/activate elsewhere
pip install -r requirements.txt
alembic upgrade head                        # build the schema
python -m app.seed                          # fill it with the site's copy + first admin
uvicorn main:app --reload                   # http://127.0.0.1:8000  (docs at /docs)
```

The seed prints the first administrator's password once, unless you set
`BOOTSTRAP_PASSWORD` in `.env`. Sign in with it at `/admin` on the frontend.

Those two commands are the whole bootstrap on a fresh database. `python -m
app.seed --reset` wipes the content tables and re-inserts the seed; without
`--reset` it only fills what is missing, so it is safe to re-run.

Schema and content are deliberately separate steps. Alembic owns the shape of
the database and must run everywhere; the seed is first-run content that only
matters until the CMS takes over, and folding it into a migration would pin
old revisions to models that keep moving.

## Where things live

| Path | What it holds |
|---|---|
| `app/models.py` | Every table. The schema is the site. |
| `app/schemas.py` | Public (camelCase, frontend-shaped) and admin (snake_case, table-shaped) schemas. |
| `app/content.py` | Assembles `GET /api/content`. |
| `app/ask.py` | Keyword resolution for the ask bar — the floor every AI path falls back to. |
| `app/ai/` | The ask bar's model path: provider adapter, table catalogue, prompts, pipeline, and the CMS-editable settings. |
| `app/routers/public.py` | The two endpoints the site calls. |
| `app/routers/admin.py` | CRUD for the CMS, one generated route set per table. |
| `app/seed.py` | Initial content, lifted from `frontend/src/content/defaults.ts`. |
| `app/security.py` | Password hashing, session tokens, and the write guard. |
| `app/media.py` | Uploaded images: validation, naming, and where they land. |
| `app/routers/uploads.py` | The three upload routes. |
| `app/routers/auth.py` | Sign-in and account management. |
| `app/accounts.py` | `python -m app.accounts` — accounts from the command line. |
| `migrations/` | Alembic. `env.py` takes the URL from `.env` and the metadata from the models. |

## The content contract

`GET /api/content` returns one object shaped exactly like the exports in
`frontend/src/content/index.ts` — `profile`, `nav`, `ask`, `answers`, `about`,
`stack`, `projects`, `experience`, `contact`. Same camelCase keys, same nesting,
same index-based references. Swapping the frontend module for a fetch is a
drop-in; no component changes.

One translation happens server-side, because the frontend addresses chips by
index while the database stores a flag: `Answer.is_chip` → `ask.chipIndices`
(indices into `answers`). It is computed against the same ordered array that
ships in the response, so it can never point at the wrong thing.

`projects.published` and `nav_items.visible` are false-able without deleting:
unpublished rows stay in the CMS and disappear from `/api/content`.

Rows that the CMS can edit in place carry their `id` in the public payload
(projects, roles, stats, stack groups and tiles, footnotes, and `nav[].rowId`).
Edit mode on the site needs a handle back to the row behind a piece of text, and
an id is not a secret — it is the same number the admin API takes in its URL.

`POST /api/ask` takes `{ question }` and returns `{ answer, matched }`. A miss
returns the fallback with `matched: false` rather than an error, so the bar
always responds.

`POST /api/ask/stream` takes the same body and streams the answer as server-sent
events — `event: delta` with `{ "text": "..." }` per chunk, then `event: done`.
This is what the site uses; the JSON route stays for scripts and `curl`. How the
answer is produced is a `.env` setting; see *The ask bar* below.

## Schema

Singletons (one row, `id = 1`, patch-only): `profile`, `about_content`,
`contact_content`, `ask_settings`.

Collections (ordered by `position`): `sections`, `nav_items`, `stats`,
`stack_groups` → `stack_tiles`, `projects`, `roles`, `footnotes`, `answers`.

`sections` holds the eyebrow + heading of each scroll section, keyed by anchor id
(`about`, `stack`, …) — so section titles are editable without touching the rows
underneath them.

Short string lists (a project's `tags` and `points`, a group's `pills`, an
answer's `keywords`, the profile's `specialities`, about's `paragraphs`) are JSON
columns. They're edited as one list in one field and never queried individually;
a table each would triple the schema for nothing.

`users` is the one table that is not content: CMS accounts, with a bcrypt hash,
a role, and an `is_active` off switch. Content edits are not attributed to it —
the site has one or two authors and `updated_at` already answers "when".

Every table carries `created_at` / `updated_at`.

## Who can write

People sign in and get a token; scripts can still use the shared key.

```
POST /api/auth/login            { username, password } -> { access_token, user }
GET  /api/auth/me               the token's account — also the "am I still signed in" check
POST /api/auth/change-password  { current_password, new_password }
GET/POST/PATCH/DELETE /api/auth/users   accounts (administrators only)
```

The token is a JWT signed with `JWT_SECRET`, sent back as
`Authorization: Bearer <token>`, and good for `JWT_TTL_MINUTES` (12 hours by
default). Every request resolves it to a row in `users`, so deactivating or
deleting an account ends its sessions immediately rather than whenever the token
would have expired. Changing `JWT_SECRET` signs everybody out at once — that is
the revoke-everything switch.

Passwords are bcrypt hashes, and login answers a wrong username and a wrong
password identically so the endpoint can't be used to enumerate accounts.

Two roles. `editor` can change every piece of content; `admin` can also manage
accounts. Neither can lock the CMS out of itself: you cannot delete or
deactivate yourself, and the last active administrator cannot be demoted or
removed.

`ADMIN_API_KEY` still opens `/api/admin/*` when sent as `X-Admin-Key`. It is not
a login — no identity is attached — so it stays for curl and scripts, and the
routes that need to know *who* refuse it. Leave it unset and only real accounts
work.

### Accounts from the shell

Bootstrapping the first login and resetting a forgotten password both have to
work when nobody can sign in, so both live in a CLI:

```bash
python -m app.accounts list
python -m app.accounts create ali --role admin --email you@example.com
python -m app.accounts passwd ali
python -m app.accounts deactivate ali
```

Omitting `--password` prompts for one, or generates and prints one where there
is no terminal. `python -m app.seed` calls the same code path to create the
first administrator when `users` is empty; `--reset` wipes content and never
touches accounts.

## Admin API

Everything under `/api/admin` requires a signed-in account (or the legacy key).

Each collection gets the same six routes, so one generic client in the CMS drives
all of them:

```
GET    /api/admin/{resource}            list
POST   /api/admin/{resource}            create
PUT    /api/admin/{resource}/reorder    { items: [{ id, position }] }, one transaction
GET    /api/admin/{resource}/{id}       read
PATCH  /api/admin/{resource}/{id}       update — only the fields you send
DELETE /api/admin/{resource}/{id}       delete
```

Resources: `nav`, `stats`, `stack-groups`, `stack-tiles`, `projects`, `roles`,
`footnotes`, `answers`. Singletons expose `GET`/`PATCH` at
`/api/admin/{profile,about,contact,ask}`. Sections are addressed by key:
`/api/admin/sections/{key}`.

Deleting a stack group deletes its tiles. Unique-constraint violations come back
as 409, missing rows as 404.

## How the frontend consumes it

`frontend/src/content/index.ts` fetches `/api/content` before the first render
and keeps `defaults.ts` as the offline copy, so a backend that is down degrades
to the bundled text instead of an empty page. In dev the Vite server proxies
`/api` here, which is why `VITE_API_URL` can stay unset and CORS never comes up.

The ask bar answers from the written answers by default — which now arrive
from the database with the rest of the content, so editing them in the CMS is
enough. Set `VITE_ASK_API=http://127.0.0.1:8000/api/ask` to resolve questions
server-side instead, which is also what turns on the model path below.

## The ask bar

With `AI_PROVIDER` unset, `/api/ask` scores the question against the keywords on
each `answers` row — the same scoring as `frontend/src/lib/ask.ts`, so pointing
the bar at the endpoint changes where the answers are edited, not what they say.

Fill `AI_PROVIDER` and `AI_API_KEY` in and a model answers instead, in two calls:

1. **Route.** `app/ai/catalog.py` describes each part of the site — key, the
   tables behind it, and a line on what it answers. The model sees that
   catalogue and the question, and returns the keys it wants read. It never sees
   a row at this stage.
2. **Answer.** Only the chosen collections are loaded and handed back to the
   model, which answers from them as plain prose — streamed straight to the page
   on `/api/ask/stream`, returned whole on `/api/ask`.

   `profile` is always included whatever the router says. It is five lines, and
   routers reliably miss it: "are you available?" reaches `contact` and leaves
   behind the field that actually answers it.

Two calls rather than one because the answering prompt should hold the tables the
question needs and no others. The whole site fits in one prompt today — the shape
is what stops that being true from becoming a rewrite.

**Every failure ends at the written answers.** No key, a rate limit, a timeout,
an empty reply: the pipeline catches it, logs one line, and returns
`ask.resolve`. A visitor never sees a stack trace, and the CMS stays the source
of truth for the answers that matter.

Streaming is the one place that guarantee has a limit. Once a chunk has been
sent it cannot be taken back, so the line is drawn at the first chunk:
everything before it still falls back, and a connection that dies mid-sentence
ends the answer short rather than stapling a different one onto it.

Four providers, all with a free tier and no card:

| `AI_PROVIDER` | Default model | Key from |
|---|---|---|
| `groq` | `openai/gpt-oss-120b` | <https://console.groq.com/keys> |
| `gemini` | `gemini-2.0-flash` | <https://aistudio.google.com/apikey> |
| `openrouter` | `meta-llama/llama-3.3-70b-instruct:free` | <https://openrouter.ai/keys> |
| `ollama` | `llama3.1` | nothing — a model on this machine |

`groq` is the fastest by a wide margin; `gemini` has the largest free daily
quota, which matters if Groq's rate limit starts biting. `AI_MODEL` and
`AI_BASE_URL` override either without touching code; the cheaper first call
already runs on the provider's smaller model, and `AI_ROUTER_MODEL` overrides
that.

Providers retire model names without warning, and a stale one is a `404
model_not_found` — not a fallback. When that happens, ask your key what it can
actually reach and set `AI_MODEL`:

```
curl -H "Authorization: Bearer $AI_API_KEY" https://api.groq.com/openai/v1/models
```

`ASK_MODE` in `.env` is the initial mode; after that the CMS owns it, along
with the model and the prompts — see *Managing it from the CMS* below.

### Managing it from the CMS

`/admin/ai` edits the `ai_settings` row: mode, which model answers, which model
routes, and both prompts. The split with `.env` is deliberate — **the provider
and the API key stay in `.env`**, because a key rendered into a form is a key in
a screenshot, and they are deployment facts rather than editorial ones. The page
shows which provider is configured and whether a key is present, never the key.

| Endpoint | |
|---|---|
| `GET/PATCH /api/admin/ai` | The settings row, plus the shipped prompts for the reset button |
| `GET /api/admin/ai/models` | What the configured key can actually reach, asked live |
| `GET /api/admin/ai/logs` | Questions asked, newest first. `?source=written` is the useful filter |
| `DELETE /api/admin/ai/logs[/{id}]` | Clear the log, or one row |

The model dropdown is built from the provider's own `/models` rather than a list
in code, because a list in code goes stale silently — Groq retired every Llama
model and the hard-coded default became a 404 that nothing could have predicted.
Non-chat families (whisper, embeddings, safety classifiers) are filtered by name;
that is a filter, not a guarantee, and a model that slips through fails on the
next question rather than quietly.

**Prompts are validated when saved, not when used.** `system_prompt` must keep
`{name}` and `user_prompt` must keep `{context}` and `{question}`; a stray brace
is rejected too. That turns a broken template into a red field in the CMS rather
than a bar that quietly falls back at midnight. Clearing a prompt restores the
shipped one, and `ai/store.py` falls back to it at answer time if a stored prompt
is somehow unrenderable anyway.

### The log

Every question writes an `ask_logs` row after the answer is on its way out —
never before, because logging is not allowed to be the reason the bar fails.
Each row carries what was asked, what came back, whether a model or the written
set produced it, which collections the router chose, the model, the latency, and
`error`: why that row fell back, when it did.

Filtering to `written` is the point of the table. Those are the questions the
model did not answer, which is the list worth either writing an answer for or
fixing the prompt over.

Questions are visitor-typed text, so the toggle to stop recording them is on the
same page. `python -m app.seed --reset` clears the log with the rest of the
content.

Adding a table to the site means adding one `Collection` to `app/ai/catalog.py`
— a key, the tables behind it, a description, and a function turning rows into
text. Nothing else in the pipeline needs to know it exists.

## Images

The CMS uploads them; the API stores and serves them.

```
POST   /api/admin/uploads             multipart `file` -> { filename, url, size, ... }
GET    /api/admin/uploads             the library, newest first
DELETE /api/admin/uploads/{filename}  remove one file
```

Files are written to `MEDIA_ROOT` (`backend/media` by default, gitignored) and
served at `MEDIA_URL` (`/media`). The `url` that comes back is exactly what goes
in `projects.image` or `about_content.portrait_image` — the frontend never
builds that path, so moving the directory is a `.env` change and nothing else.

Not `frontend/public`: that directory is copied into the bundle at build time,
so anything uploaded there at runtime would exist on one machine and nowhere
else. The SVGs already in `public/projects` still work — a stored path is used
as-is, wherever it points.

What gets in:

- The extension must be one of png, jpg, jpeg, webp, gif, avif, svg, and the
  file's first bytes must actually match it. A `.php` renamed to `.png` is
  refused on its magic number, not on trust.
- SVG is a scriptable document rather than an image, so it is parsed and
  rejected if it carries `<script>`, an inline event handler, a `javascript:`
  URL, or a remote `<use>`. `/media` is additionally served under
  `default-src 'none'` with `nosniff`, so one that slipped past can still do
  nothing.
- Larger than `MAX_UPLOAD_MB` (8) is refused before it is written.
- Names are rewritten to a slug plus a random suffix, so two `screenshot.png`
  uploads cannot collide and a guessed name cannot overwrite an existing file.
  Delete resolves the name inside the media directory and 404s if it lands
  anywhere else.

Deleting a file does not touch rows pointing at it: the alternative is scanning
every table on every delete, and a project whose screenshot is missing renders
its empty frame rather than breaking.

## Migrations

Alembic owns the schema. After changing a model:

```bash
alembic revision --autogenerate -m "what changed"
# read the generated file before trusting it
alembic upgrade head
alembic downgrade -1     # if it was wrong
alembic current          # what this database is on
```

`migrations/env.py` reads `DATABASE_URL` from `.env` and `Base.metadata` from
`app/models.py`, so the URL is never duplicated in `alembic.ini` and
autogenerate always compares against the real models. `compare_type=True` is on,
so column type changes are detected too — but autogenerate still misses things
(renames read as drop + add, and data never moves itself). Read the diff.

`AUTO_CREATE_TABLES=0` in `.env` keeps `create_all()` out of startup now that
migrations exist; leaving both on would let a running app create tables that no
revision knows about.

## Notes

- `CORS_ORIGINS` defaults to the Vite dev server. Add the deployed origin there.
- `JWT_SECRET` falls back to `ADMIN_API_KEY` when unset, so an existing `.env`
  keeps working. Set it to its own value in production.
- `MEDIA_ROOT` is a real directory on the server, and the one thing here worth
  backing up that `mysqldump` will not cover.
- MySQL runs in a container on this machine; `.env` points at it. Never commit
  `.env` — `.env.example` documents the keys.

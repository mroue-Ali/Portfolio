# frontend

Ali Mroue's portfolio — React + TypeScript + Vite, implementing the
"Ali Mroue Portfolio v2 Grey" Claude Design — and the CMS that edits it.

Two apps behind one Vite entry: `/` is the portfolio, `/admin` is the CMS.
`main.tsx` picks by path and imports the CMS dynamically, so a visitor never
downloads it.

```bash
npm run dev      # dev server, proxying /api to the backend
npm run build    # typecheck + production build
npm run lint
```

The site loads its copy from the content API (`backend/`), so start that too —
`uvicorn main:app --reload` from `backend/`. Without it the page still renders,
from the copy bundled in `src/content/defaults.ts`.

## Where things live

| Path | What it holds |
|---|---|
| `src/content/index.ts` | **All copy and data.** Loads it from the API; nothing is hardcoded in components. |
| `src/content/types.ts` | The shapes both the API and the fallback satisfy. |
| `src/content/defaults.ts` | The bundled copy, used when the API is unreachable. |
| `src/content/icons.ts` | Generated SVG paths — do not edit by hand. |
| `src/theme.ts` | The live palette, the shipped presets, `applyTheme()`, fonts and shared type styles. |
| `src/styles/global.css` | Base styles, keyframes, and every hover state. |
| `src/components/` | One file per section, plus the fixed overlays. |
| `src/hooks/useSiteAnimations.ts` | Lenis + every ScrollTrigger, in one place. |
| `src/lib/trail.ts` | The pointer trail: the whole particle simulation, as a plain module. |
| `src/lib/ask.ts` | Ask-bar answer resolution. |
| `src/cms/` | The CMS at `/admin`: sign-in, API client, form kit, one page per resource. |
| `src/cms/ImageField.tsx` | Upload, drag-drop, and the library of what you have already uploaded. |
| `src/live/` | Edit mode on the portfolio itself: bindings, `<Editable>`, the edit bar, the slide-over. |

### Content is the seam

Components import `about`, `projects`, `profile`, … from `src/content` and never
contain copy. `main.tsx` awaits `loadContent()` before the first render; it
fetches `GET /api/content` and fills those exports in place, so components never
learn where the text came from and GSAP still measures a settled DOM.

Anything the API can't provide — down, timed out, half-seeded — leaves
`defaults.ts` in place. The site is never blank because the backend is.

Edit content in the CMS. `defaults.ts` is the offline copy; refresh it by hand
only when you want the bundled text to catch up with the database.

| Env | Effect |
|---|---|
| *(nothing)* | Requests go to `/api/...` on the same origin; the dev server proxies them to `VITE_API_PROXY` (default `http://127.0.0.1:8000`). |
| `VITE_API_URL` | Absolute API origin, for when the API isn't behind the same domain. Add that origin to `CORS_ORIGINS` in `backend/.env`. |

Uploaded images are served by the API at `/media/…`, which the dev server
proxies alongside `/api`. `assetUrl()` in `src/content` is what turns a stored
path into an `<img src>`: `/media/…` resolves against the API origin, everything
else — the SVGs in `public/projects` — against the site's own.

See `.env.example`.

### Icons

`src/content/icons.ts` is generated. After adding a tool to `stack.groups`:

```bash
node scripts/generate-icons.mjs
```

It pulls artwork from `simple-icons`. Slugs that package doesn't carry (C#,
React Native, AWS S3, Azure — trademark removals) use hand-drawn fallbacks
defined inside the script.

### The ask bar

Answers come from the keyword-matched set in `content.answers`. To point it at a
real retrieval backend, set:

```
VITE_ASK_API=http://localhost:8000/api/ask
```

`src/lib/ask.ts` appends `/stream` to that value and consumes the server-sent
events from `POST /api/ask/stream`, appending each chunk to the panel as it
arrives. Chunks are batched into one state update per animation frame — a burst
of twenty arrives faster than the eye resolves, and one render is enough.

Any failure *before* the first chunk — no endpoint, network, non-200, or twenty
seconds without a byte — falls back to the written answers, so the bar always
responds. After the first chunk it cannot: the visitor is already reading, so a
dropped connection ends the answer where it stopped rather than replacing it.

## The CMS

`/admin` — sign in with an account from `backend`'s `python -m app.accounts`.
Every table gets the same treatment: singletons are a form, collections are a
list of collapsible rows with add, delete, and reorder. Saving is explicit; a
dot on a collapsed row means it has unsaved changes.

The whole thing is two components. `SingletonEditor` and `CollectionEditor` take
a `FieldSpec[]` — `{ name, label, type, hint }` per column — and build the form,
so a page like `pages/ProjectsPage.tsx` is a spec and a title. Adding a column to
a table is a line of config, and a fix to save handling fixes all nine
resources at once.

| Path | What it holds |
|---|---|
| `src/cms/api.ts` | Typed client for every admin route, plus the token and error handling. |
| `src/cms/session.ts` | Who is signed in. A module store, because the portfolio needs it too. |
| `src/cms/editors.tsx` | The two editors everything is built from. |
| `src/cms/draft.ts` | Draft state and saving, shared by the editors and the Theme page. |
| `src/cms/fields.tsx` | The controls, and the spec that stamps them out. |
| `src/cms/pages/` | One file per resource — mostly field specs. |
| `src/cms/pages/ThemeTemplates.tsx` | Saved pointer setups: the one part of Theme with its own resource. |

### Theme

`/admin/theme` is the one page that is not a generated form, because two of its
controls are not fields: picking a palette writes seven columns at once, and the
preview runs the real particle simulation against the unsaved draft. It drives
`useDraft` directly, so dirty state and saving behave exactly as they do on every
other page.

It edits four things. **Palette** - nine shipped sets, or any of the seven roles
by hand; editing one by hand flips the preset label to `custom`. **Cursor** -
which of six shapes replaces the system arrow, its size, and whether it turns;
`native` gives the arrow back and switches the rest off. **Trail** - what the
cursor generates as you move it: the mark, which direction nodes travel relative
to your hand, how long they last, how bright they are, how far apart, how much
they wander, whether they link to each other and back to the cursor, and what a
visitor who has asked for reduced motion sees instead. **Templates** - whole
pointer setups saved under a name, so a version worth keeping survives the next
hour of experimenting; Apply loads one into the form rather than writing it, so
it can be seen in the preview first. Each of the last three has a Reset that puts
the shipped values back, taken from `content/defaults.ts` so what it restores is
what an unconfigured site actually renders.

Saved changes reach the public site on its next load: `applyTheme()` runs once in
`main.tsx`, before the first render, for the same reason the copy is fetched
there - components read `color` while rendering, and `global.css` reads the
custom properties it writes.

### Images

Anywhere the CMS asks for an image — a project screenshot, the portrait — you
get a preview, an Upload button, a drop target, and a library of everything
already uploaded. The stored path stays visible and editable underneath, because
the artwork that ships in `public/` is referenced by path and always will be.

Uploads go to the API, which validates and stores them (see `backend/README.md`
for what is allowed in). The field stores whatever URL comes back.

### Deploying

`/admin` is a client route, so whatever serves the build has to fall back to
`index.html` for unknown paths — `try_files $uri /index.html` in nginx, or the
equivalent. `/media` and `/api` have to reach the backend. `npm run dev` and
`npm run preview` already do both.

## Edit mode

Open the site while signed in and there is an edit bar in the corner. Switch it
on and every piece of copy on the page becomes typeable in place: click, type,
Enter to save, Escape to cancel. What you edit is the real page — real font, real
size, real layout — because the element itself becomes `contentEditable` rather
than being swapped for an input.

Images are edited the same way: hover the portrait or a project screenshot and
you get **Replace image** over the real frame, at the real size, which is the
only way to judge a crop. Drop a file on it or pick one — it uploads and saves in
one gesture.

`Add & arrange` opens the CMS in a slide-over, on whichever section you are
looking at. That covers everything inline editing cannot: adding a project,
reordering the timeline, unpublishing an answer.

How it fits together:

- `live/bindings.ts` says what a piece of text *is* — which table, which row,
  which column, and how to update the page after the write. Components pass a
  binding to `<Editable>` and stay ignorant of the API.
- `live/store.ts` re-renders the page after an edit. The content modules are
  mutated in place and a version counter bumps, so nothing remounts and GSAP
  keeps the measurements it already made.
- `live/ImageDrop.tsx` is the same idea for pictures: mounted inside the frame
  that already holds one, invisible until pointed at, and nothing at all outside
  edit mode.
- `live/EditLayer.tsx` is the only thing `App.tsx` mounts. For a signed-out
  visitor it renders nothing and makes no request — remove that one line and the
  site is exactly what it was before the CMS existed.

Text with no row behind it is not editable: with the API down the page falls
back to `defaults.ts`, which has nothing to save to, and the bar says so.

## Styling note

Hover states live in `global.css`, not inline. Inline styles outrank class
rules, so any property that changes on hover must not also be set inline.

## Motion

`prefers-reduced-motion` is honoured throughout: no smooth scroll, no rolling
headline, a cursor that tracks without spinning, and the project track stacks
instead of pinning.

The pointer trail is the one place where honouring it is a decision rather than a
rule, so the CMS makes the decision instead of the code: **Theme -> Reduced
motion** chooses between keeping the nodes and taking the travel out of them
(the default), showing the trail as set to everyone, or showing those visitors
nothing. `lib/trail.ts` is told whether *this* visitor asked for less motion and
reads the policy off the settings; `isCalm` and `isSilenced` are where the two
meet. The CMS preview is given the same answer as the site, so an editor on a
reduce-motion machine is not quietly previewing something other than what they
ship.

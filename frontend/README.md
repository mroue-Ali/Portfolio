# frontend

Ali Mroue's portfolio — React + TypeScript + Vite, implementing the
"Ali Mroue Portfolio v2 Grey" Claude Design.

```bash
npm run dev      # dev server
npm run build    # typecheck + production build
npm run lint
```

## Where things live

| Path | What it holds |
|---|---|
| `src/content/index.ts` | **All copy and data.** Nothing is hardcoded in components. |
| `src/content/icons.ts` | Generated SVG paths — do not edit by hand. |
| `src/theme.ts` | Colours, fonts, gradients, shared type styles. |
| `src/styles/global.css` | Base styles, keyframes, and every hover state. |
| `src/components/` | One file per section, plus the fixed overlays. |
| `src/hooks/useSiteAnimations.ts` | Lenis + every ScrollTrigger, in one place. |
| `src/hooks/useVectorField.ts` | The hero particle canvas. |
| `src/lib/ask.ts` | Ask-bar answer resolution. |

### Content is the seam

Components read from `src/content/index.ts` and never contain copy. To swap in a
CMS/admin backend later, replace that module with a fetch returning the same
shapes — the exported types (`Project`, `Role`, `StackGroup`, `Answer`, …) are
the contract.

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

The endpoint takes `{ question }` and returns `{ answer, sources }`, where
`sources` are tags from `SOURCE_NODES` (`proj/kb-rag`, `exp/parcel-tracer`,
`stack/backend`, `about/independent`) — those drive the lit nodes in the hero
canvas. Any failure falls back to the written answers, so the bar always
responds.

## Styling note

Hover states live in `global.css`, not inline. Inline styles outrank class
rules, so any property that changes on hover must not also be set inline.

## Motion

`prefers-reduced-motion` is honoured throughout: no smooth scroll, no drift in
the particle field, no rolling headline, and the project track stacks instead of
pinning.

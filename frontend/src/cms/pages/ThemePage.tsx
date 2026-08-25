/**
 * Theme: the site's palette, its pointer, and what the pointer leaves behind.
 *
 * Not built on `SingletonEditor` like the other one-row pages, because two of
 * the controls are not fields. Picking a palette writes seven columns at once,
 * and the preview has to run the real particle simulation against the draft
 * rather than against what is saved. So the page drives `useDraft` directly —
 * the same hook the generic editors use, so dirty state, save, and error
 * handling behave exactly as they do everywhere else.
 *
 * Everything below the pickers is an ordinary `FieldSpec[]`, split into groups
 * only so the form reads as sections rather than one wall of sliders.
 */

import { useEffect, useMemo, useRef } from 'react';
import { api, type ThemeRow } from '../api';
import { CursorShape } from '../../components/CursorShape';
import type { ThemeColors, ThemeTrail } from '../../content';
import { Fields, type FieldSpec } from '../fields';
import { pick, useDraft, type Draft } from '../draft';
import {
  CURSOR_STYLES,
  REDUCED_MOTIONS,
  TRAIL_COLORS,
  TRAIL_MOTIONS,
  TRAIL_PARTICLES,
  createTrail,
  type TrailHandle,
} from '../../lib/trail';
import { prefersReducedMotion } from '../../lib/motion';
import { theme as bundled } from '../../content/defaults';
import { ThemeTemplates } from './ThemeTemplates';
import { PRESETS } from '../../theme';
import { cms, mono } from '../tokens';
import { Button, Card, ErrorNote, PageHeader, SaveStatus, SectionTitle, Spinner } from '../ui';
import { useResource } from '../useResource';

// --------------------------------------------------------------------------- //
// Specs
// --------------------------------------------------------------------------- //

const PALETTE_SPECS: FieldSpec[] = [
  { name: 'color_bg', label: 'Background', type: 'color', span: 1 },
  { name: 'color_surface', label: 'Surface', type: 'color', span: 1 },
  { name: 'color_border', label: 'Border', type: 'color', span: 1 },
  { name: 'color_text', label: 'Text', type: 'color', span: 1 },
  { name: 'color_muted', label: 'Muted text', type: 'color', span: 1 },
  { name: 'color_accent', label: 'Accent', type: 'color', span: 1 },
  { name: 'color_accent_alt', label: 'Second accent', type: 'color', span: 1 },
];

const CURSOR_SPECS: FieldSpec[] = [
  {
    name: 'cursor_size',
    label: 'Size',
    type: 'range',
    min: 12,
    max: 96,
    unit: 'px',
    hint: 'Outer diameter. The core scales with it.',
  },
  {
    name: 'cursor_spin',
    label: 'Rotate',
    type: 'toggle',
    hint: 'Turns the arcs. Reticle and crosshair only.',
  },
];

const TRAIL_SHAPE_SPECS: FieldSpec[] = [
  {
    name: 'trail_motion',
    label: 'Direction of travel',
    type: 'select',
    options: TRAIL_MOTIONS.map((m) => ({ value: m.value, label: m.label })),
    hint: 'Which way a node leaves the cursor once it is dropped.',
  },
  {
    name: 'trail_color',
    label: 'Colour',
    type: 'select',
    options: TRAIL_COLORS.map((c) => ({ value: c.value, label: c.label })),
    hint: 'Drawn from the palette above, so it follows a preset change.',
  },
];

const TRAIL_FEEL_SPECS: FieldSpec[] = [
  {
    name: 'trail_opacity',
    label: 'Opacity',
    type: 'range',
    min: 0,
    max: 100,
    unit: '%',
    hint: 'The whole effect, dimmed. Low values give you the shape of it without the light.',
  },
  {
    name: 'trail_life',
    label: 'Time until it fades',
    type: 'range',
    min: 100,
    max: 8000,
    step: 50,
    unit: 'ms',
    hint: 'How long a node lasts from the moment it is dropped.',
  },
  { name: 'trail_size', label: 'Node size', type: 'range', min: 1, max: 60, unit: 'px' },
  {
    name: 'trail_density',
    label: 'Spacing',
    type: 'range',
    min: 2,
    max: 60,
    unit: 'px',
    hint: 'Pixels of cursor travel between two nodes. Lower is denser.',
  },
  {
    name: 'trail_speed',
    label: 'Launch speed',
    type: 'range',
    min: 0,
    max: 300,
    unit: '%',
    hint: "Share of your hand's speed a node is thrown with.",
  },
  {
    name: 'trail_swirl',
    label: 'Wander',
    type: 'range',
    min: 0,
    max: 100,
    unit: '%',
    hint: 'A curl field under everything. Zero makes nodes run straight.',
  },
  {
    name: 'trail_repel',
    label: 'Cursor push',
    type: 'range',
    min: 0,
    max: 100,
    unit: '%',
    hint: 'How hard the cursor shoves nodes out of its way as it passes back over them.',
  },
];

const TRAIL_LINK_SPECS: FieldSpec[] = [
  { name: 'trail_links', label: 'Link nearby nodes', type: 'toggle' },
  {
    name: 'trail_link_distance',
    label: 'Link reach',
    type: 'range',
    min: 0,
    max: 320,
    unit: 'px',
    hint: 'How far apart two nodes can be and still draw a line.',
  },
  {
    name: 'trail_threads',
    label: 'Thread to the cursor',
    type: 'toggle',
    hint: 'Lines from the live cursor back to the nodes nearest it.',
  },
  {
    name: 'trail_burst',
    label: 'Burst on click',
    type: 'toggle',
    hint: 'A ring of nodes thrown outwards from wherever you click.',
  },
];

const REDUCED_SPEC: FieldSpec[] = [
  {
    name: 'trail_reduced',
    label: 'If a visitor asked for less motion',
    type: 'select',
    span: 2,
    options: REDUCED_MOTIONS.map((r) => ({ value: r.value, label: r.label })),
    hint:
      'Some people set their operating system to reduce animation, and browsers pass that on. ' +
      'Calm keeps the nodes but takes the travel out of them — so direction, wander and push do nothing for those visitors.',
  },
];

const ENABLED_SPEC: FieldSpec[] = [
  {
    name: 'trail_enabled',
    label: 'Trail',
    type: 'toggle',
    hint: 'Off leaves the custom cursor and nothing behind it.',
  },
];

/** Hidden fields — edited by the pickers, but still part of the draft. */
const PICKER_SPECS: FieldSpec[] = [
  { name: 'preset', label: 'Preset' },
  { name: 'cursor_style', label: 'Cursor style' },
  { name: 'trail_particle', label: 'Particle' },
];

const ALL_SPECS: FieldSpec[] = [
  ...PICKER_SPECS,
  ...PALETTE_SPECS,
  ...CURSOR_SPECS,
  ...ENABLED_SPEC,
  ...TRAIL_SHAPE_SPECS,
  ...TRAIL_FEEL_SPECS,
  ...TRAIL_LINK_SPECS,
  ...REDUCED_SPEC,
];

/**
 * The pointer as it ships, flattened into column names.
 *
 * Taken from the bundled copy rather than written out again, so Reset restores
 * what an unconfigured site actually renders — the same object the frontend
 * falls back to when the API is unreachable, and the same values
 * `backend/app/seed.py` inserts. Three copies that agree is one copy.
 */
const DEFAULT_CURSOR: Draft = {
  cursor_style: bundled.cursor.style,
  cursor_size: bundled.cursor.size,
  cursor_spin: bundled.cursor.spin,
};

const DEFAULT_TRAIL: Draft = {
  trail_enabled: bundled.trail.enabled,
  trail_particle: bundled.trail.particle,
  trail_links: bundled.trail.links,
  trail_link_distance: bundled.trail.linkDistance,
  trail_threads: bundled.trail.threads,
  trail_motion: bundled.trail.motion,
  trail_speed: bundled.trail.speed,
  trail_life: bundled.trail.life,
  trail_opacity: bundled.trail.opacity,
  trail_size: bundled.trail.size,
  trail_density: bundled.trail.density,
  trail_color: bundled.trail.color,
  trail_swirl: bundled.trail.swirl,
  trail_repel: bundled.trail.repel,
  trail_burst: bundled.trail.burst,
  trail_reduced: bundled.trail.reduced,
};

/** Everything a template carries, and everything the two Reset buttons cover. */
const POINTER_KEYS = [...Object.keys(DEFAULT_CURSOR), ...Object.keys(DEFAULT_TRAIL)];

/** The column names a palette owns, in the order the swatches show them. */
const COLOR_KEYS = [
  ['color_bg', 'bg'],
  ['color_surface', 'surface'],
  ['color_border', 'border'],
  ['color_text', 'text'],
  ['color_muted', 'muted'],
  ['color_accent', 'accent'],
  ['color_accent_alt', 'accentAlt'],
] as const;

const colorsFrom = (draft: Draft): ThemeColors => ({
  bg: String(draft.color_bg ?? '#15181D'),
  surface: String(draft.color_surface ?? '#1E2228'),
  border: String(draft.color_border ?? '#2F353E'),
  text: String(draft.color_text ?? '#E9ECF0'),
  muted: String(draft.color_muted ?? '#9AA2AD'),
  accent: String(draft.color_accent ?? '#7B68FA'),
  accentAlt: String(draft.color_accent_alt ?? '#45D9EF'),
});

const trailFrom = (draft: Draft): ThemeTrail => ({
  enabled: Boolean(draft.trail_enabled),
  particle: draft.trail_particle as ThemeTrail['particle'],
  links: Boolean(draft.trail_links),
  linkDistance: Number(draft.trail_link_distance),
  threads: Boolean(draft.trail_threads),
  motion: draft.trail_motion as ThemeTrail['motion'],
  speed: Number(draft.trail_speed),
  life: Number(draft.trail_life),
  opacity: Number(draft.trail_opacity),
  size: Number(draft.trail_size),
  density: Number(draft.trail_density),
  color: draft.trail_color as ThemeTrail['color'],
  swirl: Number(draft.trail_swirl),
  repel: Number(draft.trail_repel),
  burst: Boolean(draft.trail_burst),
  reduced: draft.trail_reduced as ThemeTrail['reduced'],
});

// --------------------------------------------------------------------------- //
// Pickers
// --------------------------------------------------------------------------- //

/** A section heading with something on the right of it. */
function SectionRow({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <SectionTitle hint={hint}>{title}</SectionTitle>
      </div>
      {action && <div style={{ flex: 'none' }}>{action}</div>}
    </div>
  );
}

function OptionGrid({ children, min = 150 }: { children: React.ReactNode; min?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

function OptionCard({
  active,
  label,
  note,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  note?: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" className="cms-option" data-active={active} onClick={onClick}>
      {children}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        {note && (
          <span style={{ color: cms.muted, fontSize: 11.5, lineHeight: 1.45 }}>{note}</span>
        )}
      </span>
    </button>
  );
}

function PresetPicker({
  value,
  onPick,
}: {
  value: string;
  onPick: (key: string, colors: ThemeColors) => void;
}) {
  return (
    <OptionGrid min={188}>
      {PRESETS.map((preset) => (
        <OptionCard
          key={preset.key}
          active={value === preset.key}
          label={preset.label}
          note={preset.note}
          onClick={() => onPick(preset.key, preset.colors)}
        >
          {/* The palette as it will be used: the page ground, then the roles
              that sit on it, then the two accents at full width. */}
          <span
            style={{
              display: 'block',
              padding: 10,
              borderRadius: 4,
              background: preset.colors.bg,
              border: `1px solid ${preset.colors.border}`,
            }}
          >
            <span style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
              {[preset.colors.surface, preset.colors.border, preset.colors.text, preset.colors.muted].map(
                (c) => (
                  <span
                    key={c}
                    style={{ width: 15, height: 15, borderRadius: 3, background: c, flex: 'none' }}
                  />
                ),
              )}
            </span>
            <span
              style={{
                display: 'block',
                height: 8,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${preset.colors.accent}, ${preset.colors.accentAlt})`,
              }}
            />
          </span>
        </OptionCard>
      ))}
    </OptionGrid>
  );
}

/** A shape option needs to be seen, so each card renders the real thing. */
function CursorPicker({ value, onPick }: { value: string; onPick: (key: string) => void }) {
  return (
    <OptionGrid min={158}>
      {CURSOR_STYLES.map((option) => (
        <OptionCard
          key={option.value}
          active={value === option.value}
          label={option.label}
          note={option.note}
          onClick={() => onPick(option.value)}
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              height: 56,
              borderRadius: 4,
              background: cms.bg,
            }}
          >
            {option.value === 'native' ? (
              <NativeArrow />
            ) : (
              <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
                <CursorShape style={option.value} size={40} />
                <span
                  style={{
                    position: 'absolute',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: cms.text,
                  }}
                />
              </span>
            )}
          </span>
        </OptionCard>
      ))}
    </OptionGrid>
  );
}

function NativeArrow() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={cms.text} aria-hidden="true">
      <path d="M5 2l14 9-6 1.2 3.2 6.4-2.6 1.3-3.2-6.4L5 18z" />
    </svg>
  );
}

/** One particle, drawn the way `trail.ts` draws it. */
function ParticleMark({ kind, color }: { kind: string; color: string }) {
  const s = 26;
  const c = s / 2;
  const common = { stroke: color, fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const };
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
      {kind === 'dot' && (
        <>
          <circle cx={c} cy={c} r={9} fill={color} opacity={0.18} />
          <circle cx={c} cy={c} r={4.5} fill={color} />
        </>
      )}
      {kind === 'ring' && <circle cx={c} cy={c} r={7} {...common} />}
      {kind === 'square' && <rect x={c - 6} y={c - 6} width={12} height={12} fill={color} />}
      {kind === 'diamond' && (
        <path d={`M${c} ${c - 8}L${c + 8} ${c}L${c} ${c + 8}L${c - 8} ${c}Z`} fill={color} />
      )}
      {kind === 'plus' && <path d={`M${c - 7} ${c}h14M${c} ${c - 7}v14`} {...common} />}
      {kind === 'spark' && <path d={`M${c - 7} ${c + 7}L${c + 7} ${c - 7}`} {...common} />}
    </svg>
  );
}

function ParticlePicker({
  value,
  accent,
  onPick,
}: {
  value: string;
  accent: string;
  onPick: (key: string) => void;
}) {
  return (
    <OptionGrid min={150}>
      {TRAIL_PARTICLES.map((option) => (
        <OptionCard
          key={option.value}
          active={value === option.value}
          label={option.label}
          note={option.note}
          onClick={() => onPick(option.value)}
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              height: 48,
              borderRadius: 4,
              background: cms.bg,
            }}
          >
            <ParticleMark kind={option.value} color={accent} />
          </span>
        </OptionCard>
      ))}
    </OptionGrid>
  );
}

// --------------------------------------------------------------------------- //
// Preview
// --------------------------------------------------------------------------- //

/**
 * The draft, running.
 *
 * The same `createTrail` the site mounts, pointed at this box instead of the
 * window — so what an editor is looking at is the simulation, not a drawing of
 * it. Settings are pushed in on every draft change rather than remounting, which
 * keeps the nodes already on screen and lets a slider be felt while it moves.
 *
 * It is given the same reduce-motion answer the site would give this browser,
 * which is the whole point: a preview that quietly ignored the setting showed an
 * editor on a reduce-motion machine one thing and shipped them another.
 */
function Preview({ colors, trail, cursorStyle, cursorSize }: {
  colors: ThemeColors;
  trail: ThemeTrail;
  cursorStyle: ThemeRow['cursor_style'];
  cursorSize: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const puck = useRef<HTMLDivElement>(null);
  const handle = useRef<TrailHandle | null>(null);

  useEffect(() => {
    const cv = canvas.current;
    const host = box.current;
    if (!cv || !host) return;
    handle.current = createTrail(cv, {
      settings: trail,
      palette: colors,
      host,
      reducedMotion: prefersReducedMotion(),
    });
    return () => {
      handle.current?.destroy();
      handle.current = null;
    };
    // Mounted once; every later change goes through `update` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handle.current?.update(trail, colors);
  }, [trail, colors]);

  // The cursor half of the preview: the chosen shape, following the pointer
  // inside the box only.
  useEffect(() => {
    const host = box.current;
    const p = puck.current;
    if (!host || !p) return;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      p.style.opacity = '1';
      p.style.transform = `translate3d(${e.clientX - r.left}px,${e.clientY - r.top}px,0)`;
    };
    const onLeave = () => {
      p.style.opacity = '0';
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={box}
      style={{
        position: 'relative',
        height: 300,
        borderRadius: 6,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        overflow: 'hidden',
        cursor: cursorStyle === 'native' ? 'default' : 'none',
      }}
    >
      <canvas
        ref={canvas}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none',
          textAlign: 'center',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              background: `linear-gradient(135deg, ${colors.text} 10%, ${colors.accent} 55%, ${colors.accentAlt} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Move your pointer here
          </span>
          <span style={{ ...mono, fontSize: 10, color: colors.muted }}>
            live — click to test the burst
          </span>
        </div>
      </div>

      {cursorStyle !== 'native' && (
        <div
          ref={puck}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: cursorSize,
            height: cursorSize,
            margin: `${-cursorSize / 2}px 0 0 ${-cursorSize / 2}px`,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            opacity: 0,
            willChange: 'transform',
          }}
        >
          <CursorShape style={cursorStyle} size={cursorSize} />
          <span
            style={{
              position: 'absolute',
              width: Math.max(4, Math.round(cursorSize * 0.14)),
              height: Math.max(4, Math.round(cursorSize * 0.14)),
              borderRadius: '50%',
              background: colors.text,
            }}
          />
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Page
// --------------------------------------------------------------------------- //

export function ThemePage() {
  const { data, loading, error, reload } = useResource(() => api.theme.get());

  return (
    <>
      {loading && !data && <Spinner />}
      {error && (
        <div style={{ marginBottom: 18 }}>
          <ErrorNote>
            {error}{' '}
            <button className="cms-btn" data-size="sm" data-variant="ghost" onClick={reload}>
              Retry
            </button>
          </ErrorNote>
        </div>
      )}
      {data ? <ThemeForm key={data.id} row={data} /> : null}
    </>
  );
}

/** A note that is neither an error nor a hint on a single field. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '11px 14px',
        border: `1px solid rgba(69,217,239,0.3)`,
        borderRadius: 4,
        background: 'rgba(69,217,239,0.07)',
        color: cms.text,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

function ThemeForm({ row }: { row: ThemeRow }) {
  const form = useDraft(pick(ALL_SPECS, row as unknown as Draft), ALL_SPECS, (payload) =>
    api.theme.update(payload as Partial<ThemeRow>) as Promise<Draft>,
  );
  const { draft, set, setMany } = form;

  const colors = useMemo(() => colorsFrom(draft), [draft]);
  const trail = useMemo(() => trailFrom(draft), [draft]);
  // Read once: it is a fact about the machine the CMS is open on, and it does
  // not change while a form is being filled in.
  const reduced = useMemo(() => prefersReducedMotion(), []);

  /**
   * Any hand edit to a colour means these are no longer that preset's colours,
   * so the label stops claiming they are.
   */
  const setField = (name: string, value: unknown) => {
    if (name.startsWith('color_')) setMany({ [name]: value, preset: 'custom' });
    else set(name, value);
  };

  /** What a template saves, and what Apply writes back. */
  const pointer = useMemo(
    () => Object.fromEntries(POINTER_KEYS.map((key) => [key, draft[key]])),
    [draft],
  );

  const pickPreset = (key: string, next: ThemeColors) =>
    setMany({
      preset: key,
      ...Object.fromEntries(COLOR_KEYS.map(([column, role]) => [column, next[role]])),
    });

  return (
    <>
      <PageHeader
        title="Theme"
        description="The site's colours, the shape of its pointer, and what the pointer leaves behind it. Saved changes reach the site the next time it loads."
        actions={
          <>
            <SaveStatus state={form.state} error={form.error} />
            <Button
              variant="primary"
              onClick={form.save}
              disabled={!form.dirty}
              busy={form.state === 'saving'}
            >
              {form.dirty ? 'Save changes' : 'Saved'}
            </Button>
          </>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <Card>
          <SectionTitle hint="Every surface, border and gradient on the site is drawn from these seven. Pick a set, then change any of them.">
            Palette
          </SectionTitle>
          <PresetPicker value={String(draft.preset ?? '')} onPick={pickPreset} />
          <div style={{ marginTop: 22 }}>
            <Fields specs={PALETTE_SPECS} draft={draft} onChange={setField} />
          </div>
        </Card>

        <Card>
          <SectionRow
            title="Cursor"
            hint="Replaces the system arrow on anything with a mouse. Touch devices keep theirs."
            action={
              <Button size="sm" onClick={() => setMany(DEFAULT_CURSOR)}>
                Reset cursor
              </Button>
            }
          />
          <CursorPicker
            value={String(draft.cursor_style ?? '')}
            onPick={(key) => set('cursor_style', key)}
          />
          <div style={{ marginTop: 22 }}>
            <Fields specs={CURSOR_SPECS} draft={draft} onChange={setField} />
          </div>
        </Card>

        <Card>
          <SectionRow
            title="What the cursor generates"
            hint="Moving the cursor drops a chain of these. They carry the momentum of your hand, drift, link up, and fade."
            action={
              <Button size="sm" onClick={() => setMany(DEFAULT_TRAIL)}>
                Reset animation
              </Button>
            }
          />
          <Fields specs={ENABLED_SPEC} draft={draft} onChange={setField} />
          <div style={{ marginTop: 22, opacity: draft.trail_enabled ? 1 : 0.45 }}>
            <ParticlePicker
              value={String(draft.trail_particle ?? '')}
              accent={colors.accent}
              onPick={(key) => set('trail_particle', key)}
            />
            <div style={{ marginTop: 22 }}>
              <Fields specs={TRAIL_SHAPE_SPECS} draft={draft} onChange={setField} />
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle hint="How much of it there is, and how long it stays. Turn the opacity down for a version you feel more than see.">
            Motion & fade
          </SectionTitle>
          <Fields specs={TRAIL_FEEL_SPECS} draft={draft} onChange={setField} />
        </Card>

        <Card>
          <SectionTitle hint="The network part: lines between nodes that are close enough to each other.">
            Links
          </SectionTitle>
          <Fields specs={TRAIL_LINK_SPECS} draft={draft} onChange={setField} />
        </Card>

        <Card>
          <SectionTitle hint="Not everyone wants things moving on a page. This is what those visitors get.">
            Reduced motion
          </SectionTitle>
          <Fields specs={REDUCED_SPEC} draft={draft} onChange={setField} />
          {reduced && (
            <div style={{ marginTop: 16 }}>
              <Notice>
                <strong>This browser is asking for reduced motion</strong>, so the preview below —
                and the site, on this machine — is running the “
                {REDUCED_MOTIONS.find((r) => r.value === draft.trail_reduced)?.label ?? 'Calm it down'}
                ” answer above rather than your full settings. Set it to{' '}
                <em>Show it anyway</em> to see and ship the whole thing, or turn the system setting
                off to check it as most visitors will see it.
              </Notice>
            </div>
          )}
        </Card>

        <Card>
          <SectionRow
            title="Templates"
            hint="Whole pointer setups — cursor and trail, not colours — saved under a name. Apply loads one into the form; it is not live until you save."
            action={
              <Button size="sm" onClick={() => setMany({ ...DEFAULT_CURSOR, ...DEFAULT_TRAIL })}>
                Reset all to default
              </Button>
            }
          />
          <ThemeTemplates current={pointer} onApply={(settings) => setMany(settings)} />
        </Card>

        <Card>
          <SectionTitle hint="The real simulation, running on what you have set — not a picture of it.">
            Preview
          </SectionTitle>
          <Preview
            colors={colors}
            trail={trail}
            cursorStyle={draft.cursor_style as ThemeRow['cursor_style']}
            cursorSize={Number(draft.cursor_size) || 36}
          />
        </Card>

        {form.error && <ErrorNote>{form.error}</ErrorNote>}
      </div>
    </>
  );
}

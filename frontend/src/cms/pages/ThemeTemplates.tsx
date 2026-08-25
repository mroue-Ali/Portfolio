/**
 * Saved pointer setups.
 *
 * Tuning a trail is fiddly and the good version is usually three sliders away
 * from the version you have. A template is that good version, kept: name it,
 * carry on experimenting, and bring it back in one click.
 *
 * Applying loads the template into the form rather than writing it to the
 * database, so it can be seen in the preview and reverted by leaving the page.
 * Saving stays where it is for everything else in the CMS — behind the Save
 * button.
 *
 * Templates hold the cursor and the trail and nothing else. Colours have their
 * own presets, and an editor bringing back a trail they liked should not find
 * their brand changed underneath them.
 */

import { useMemo, useState } from 'react';
import { api, type ThemeTemplateRow } from '../api';
import type { Draft } from '../draft';
import { TRAIL_MOTIONS, TRAIL_PARTICLES } from '../../lib/trail';
import { cms, message, mono } from '../tokens';
import { Badge, Button, DeleteButton, EmptyState, ErrorNote, Spinner } from '../ui';
import { useResource } from '../useResource';

/** A one-line read of what a template will do, from the fields that show most. */
function summarise(settings: Partial<Record<string, unknown>>): string {
  const particle = TRAIL_PARTICLES.find((p) => p.value === settings.trail_particle)?.label;
  const motion = TRAIL_MOTIONS.find((m) => m.value === settings.trail_motion)?.label;
  const parts = [
    settings.trail_enabled === false ? 'No trail' : particle,
    motion,
    settings.trail_life != null ? `${Number(settings.trail_life)}ms` : null,
    settings.trail_opacity != null ? `${Number(settings.trail_opacity)}% opacity` : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

export function ThemeTemplates({
  current,
  onApply,
}: {
  /** The pointer half of the live draft — what "save current" saves. */
  current: Draft;
  /** Hands a template's fields back to the form. */
  onApply: (settings: Draft) => void;
}) {
  const { data, setData, loading, error, reload } = useResource(() => api.themeTemplates.list());
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const rows = useMemo(() => data ?? [], [data]);
  const trimmed = name.trim();
  /**
   * Saving under a name that is taken updates that template instead of failing
   * on the unique constraint — which is what "save it again, I improved it"
   * means, and saves an editor a delete-then-create.
   */
  const existing = rows.find((row) => row.name.toLowerCase() === trimmed.toLowerCase());

  const save = async () => {
    if (!trimmed) return;
    setBusy(true);
    setActionError(null);
    setSaved(null);
    try {
      if (existing) {
        const updated = await api.themeTemplates.update(existing.id, {
          note: note.trim() || existing.note,
          settings: current as Partial<ThemeTemplateRow['settings']>,
        });
        setData(rows.map((row) => (row.id === updated.id ? updated : row)));
        setSaved(`Updated “${updated.name}”.`);
      } else {
        const created = await api.themeTemplates.create({
          name: trimmed,
          note: note.trim(),
          settings: current as ThemeTemplateRow['settings'],
          position: rows.length,
        });
        setData([...rows, created]);
        setSaved(`Saved “${created.name}”.`);
      }
      setName('');
      setNote('');
    } catch (err) {
      setActionError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: ThemeTemplateRow) => {
    setActionError(null);
    try {
      await api.themeTemplates.remove(row.id);
      setData(rows.filter((r) => r.id !== row.id));
    } catch (err) {
      setActionError(message(err));
    }
  };

  return (
    <>
      {loading && !data && <Spinner label="Loading templates" />}
      {error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorNote>
            {error}{' '}
            <button className="cms-btn" data-size="sm" data-variant="ghost" onClick={reload}>
              Retry
            </button>
          </ErrorNote>
        </div>
      )}

      {data && rows.length === 0 && (
        <EmptyState>No templates yet — set the pointer up the way you like it, then save it below.</EmptyState>
      )}

      {rows.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: 10,
          }}
        >
          {rows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 14,
                border: `1px solid ${cms.border}`,
                borderRadius: 5,
                background: cms.bg,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{row.name}</span>
                {row.note && (
                  <span style={{ color: cms.muted, fontSize: 12, lineHeight: 1.5 }}>{row.note}</span>
                )}
                <span style={{ ...mono, fontSize: 9.5, color: cms.muted, letterSpacing: '0.1em' }}>
                  {summarise(row.settings)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button size="sm" variant="primary" onClick={() => onApply(row.settings as Draft)}>
                  Apply
                </Button>
                <div style={{ marginLeft: 'auto' }}>
                  <DeleteButton onConfirm={() => remove(row)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 12,
          marginTop: 20,
          paddingTop: 18,
          borderTop: `1px solid ${cms.border}`,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 180px' }}>
          <span style={{ ...mono, color: cms.muted, fontSize: 10 }}>Name</span>
          <input
            className="cms-input"
            value={name}
            placeholder="Comet, but slower"
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '2 1 260px' }}>
          <span style={{ ...mono, color: cms.muted, fontSize: 10 }}>Note (optional)</span>
          <input
            className="cms-input"
            value={note}
            placeholder="What it is for."
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <Button variant="primary" onClick={save} disabled={!trimmed} busy={busy}>
          {existing ? 'Update template' : 'Save current as template'}
        </Button>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, minHeight: 20 }}>
        {existing && (
          <Badge tone="warn">“{existing.name}” already exists — saving will overwrite it</Badge>
        )}
        {saved && <Badge tone="ok">{saved}</Badge>}
      </div>

      {actionError && (
        <div style={{ marginTop: 12 }}>
          <ErrorNote>{actionError}</ErrorNote>
        </div>
      )}
    </>
  );
}

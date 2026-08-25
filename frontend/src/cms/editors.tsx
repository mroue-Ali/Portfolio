/**
 * The two editors every page is built from.
 *
 * `SingletonEditor` edits a one-row table as a form. `CollectionEditor` edits an
 * ordered table as a list of collapsible rows, with add, delete, and reorder.
 * Both take a `FieldSpec[]`, so a page like Projects is a spec plus a title —
 * which is the point: nine resources behave identically because they are the
 * same component, and a fix to save handling fixes all of them at once.
 *
 * Saving is explicit. Auto-save on a field that feeds a live public website is
 * how you publish a half-typed sentence; a dirty marker and a Save button are
 * worth the extra click.
 *
 * Drafts live in the form components, seeded from the row they mount with. That
 * is why the forms are separate components with a `key`: re-mounting on new data
 * is how React re-initialises state, and it beats an effect that copies props
 * into state on every render.
 */

import { useCallback, useState, type ReactNode } from 'react';
import type { Collection, Row, Singleton } from './api';
import { Fields, type FieldSpec } from './fields';
import { normalise } from './normalise';
import { contentChanged } from '../live/store';
import { cms, message, mono, type SaveState } from './tokens';
import { useResource } from './useResource';
import { Button, Card, Chevron, DeleteButton, EmptyState, ErrorNote, IconButton, PageHeader, SaveStatus, Spinner } from './ui';
import { Arrow } from './fields';

type Draft = Record<string, unknown>;

const changed = (draft: Draft, original: Draft) =>
  JSON.stringify(draft) !== JSON.stringify(original);

/** Only the fields the spec owns — never the id, timestamps, or position. */
const pick = (specs: readonly FieldSpec[], row: Draft): Draft =>
  Object.fromEntries(specs.map((spec) => [spec.name, row[spec.name]]));

/**
 * Draft state for one record: what it says, whether it differs, and a save that
 * reports where it got to. Shared by both editors so "dirty" and "saved" mean
 * the same thing in a page form and in a collapsed row.
 */
function useDraft(initial: Draft, specs: readonly FieldSpec[], write: (payload: Draft) => Promise<Draft | void>) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [original, setOriginal] = useState<Draft>(initial);
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = useCallback((name: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
  }, []);

  const save = async () => {
    setState('saving');
    setError(null);
    try {
      const payload = normalise(specs, draft);
      const saved = await write(payload);
      // The server may have normalised something; trust its copy when it sends one.
      const settled = saved ? pick(specs, saved as Draft) : payload;
      setDraft(settled);
      setOriginal(settled);
      setState('saved');
      contentChanged();
      window.setTimeout(() => setState('idle'), 1700);
    } catch (err) {
      setError(message(err));
      setState('error');
    }
  };

  return { draft, set, save, state, error, dirty: changed(draft, original) };
}

// --------------------------------------------------------------------------- //
// Singleton
// --------------------------------------------------------------------------- //

export function SingletonEditor<T extends object>({
  title,
  description,
  specs,
  resource,
  children,
}: {
  title: string;
  description?: string;
  specs: readonly FieldSpec[];
  resource: Singleton<T>;
  /** Extra content below the form — another editor, usually. */
  children?: ReactNode;
}) {
  const { data, loading, error, reload } = useResource(() => resource.get());

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

      {data ? (
        <SingletonForm
          title={title}
          description={description}
          specs={specs}
          row={data as Draft}
          write={(payload) => resource.update(payload as Partial<T>) as Promise<Draft>}
        />
      ) : (
        <PageHeader title={title} description={description} />
      )}

      {children && <div style={{ marginTop: 34 }}>{children}</div>}
    </>
  );
}

function SingletonForm({
  title,
  description,
  specs,
  row,
  write,
}: {
  title: string;
  description?: string;
  specs: readonly FieldSpec[];
  row: Draft;
  write: (payload: Draft) => Promise<Draft>;
}) {
  const form = useDraft(pick(specs, row), specs, write);

  return (
    <>
      <PageHeader
        title={title}
        description={description}
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
      <Card>
        <Fields specs={specs} draft={form.draft} onChange={form.set} />
        {form.error && (
          <div style={{ marginTop: 16 }}>
            <ErrorNote>{form.error}</ErrorNote>
          </div>
        )}
      </Card>
    </>
  );
}

// --------------------------------------------------------------------------- //
// Collection
// --------------------------------------------------------------------------- //

export type CollectionEditorProps<T extends Row> = {
  title?: string;
  description?: string;
  specs: readonly FieldSpec[];
  resource: Collection<T>;
  /** Field values for a freshly added row — enough to satisfy NOT NULL columns. */
  blank: () => Partial<T>;
  /** The collapsed row's headline. */
  rowTitle: (row: T) => string;
  /** Badges or counts shown next to the headline. */
  rowMeta?: (row: T) => ReactNode;
  addLabel?: string;
  emptyLabel?: string;
  /** Off for tables where order is not meaningful. */
  reorderable?: boolean;
  /** Rendered inside an expanded row, under the fields. */
  rowExtra?: (row: T) => ReactNode;
  /** Compact heading instead of a page header — for a second list on a page. */
  inline?: boolean;
};

export function CollectionEditor<T extends Row>({
  title,
  description,
  specs,
  resource,
  blank,
  rowTitle,
  rowMeta,
  addLabel = 'Add',
  emptyLabel = 'Nothing here yet.',
  reorderable = true,
  rowExtra,
  inline = false,
}: CollectionEditorProps<T>) {
  const { data, setData, loading, error, reload } = useResource(() => resource.list());
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = data ?? [];

  const add = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const created = await resource.create({ ...blank(), position: rows.length } as Partial<T>);
      setData([...rows, created]);
      setOpenId(created.id);
      contentChanged();
    } catch (err) {
      setActionError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setActionError(null);
    try {
      await resource.remove(id);
      setData(rows.filter((row) => row.id !== id));
      contentChanged();
    } catch (err) {
      setActionError(message(err));
    }
  };

  /**
   * Moves a row and renumbers every position from zero.
   *
   * Sending the whole list rather than the two rows that swapped keeps the
   * positions dense even if they started out sparse or duplicated — and the
   * endpoint applies them in one transaction, so the list can't end up half
   * reordered. If it fails, the server's order is refetched rather than left
   * disagreeing with what is on screen.
   */
  const move = async (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setData(next);
    try {
      await resource.reorder(next.map((row, position) => ({ id: row.id, position })));
      contentChanged();
    } catch (err) {
      setActionError(message(err));
      reload();
    }
  };

  const addButton = (
    <Button
      variant={inline ? 'default' : 'primary'}
      size={inline ? 'sm' : 'md'}
      onClick={add}
      busy={busy}
    >
      + {addLabel}
    </Button>
  );

  return (
    <>
      {inline ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {title && (
              <h2 style={{ ...mono, margin: 0, color: cms.muted, fontWeight: 500 }}>{title}</h2>
            )}
            {description && (
              <p style={{ margin: 0, color: cms.muted, fontSize: 13, lineHeight: 1.55 }}>
                {description}
              </p>
            )}
          </div>
          {addButton}
        </div>
      ) : (
        <PageHeader title={title ?? ''} description={description} actions={addButton} />
      )}

      {actionError && (
        <div style={{ marginBottom: 14 }}>
          <ErrorNote>{actionError}</ErrorNote>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {loading && !data && <Spinner />}

      {data && rows.length === 0 && <EmptyState action={addButton}>{emptyLabel}</EmptyState>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, index) => (
          <RowEditor
            key={row.id}
            row={row}
            index={index}
            count={rows.length}
            specs={specs}
            open={openId === row.id}
            reorderable={reorderable}
            title={rowTitle(row)}
            meta={rowMeta?.(row)}
            onToggle={() => setOpenId(openId === row.id ? null : row.id)}
            onMove={move}
            onDelete={() => remove(row.id)}
            write={async (payload) => {
              const saved = await resource.update(row.id, payload as Partial<T>);
              setData(rows.map((r) => (r.id === row.id ? saved : r)));
              return saved as Draft;
            }}
            extra={rowExtra?.(row)}
          />
        ))}
      </div>
    </>
  );
}

function RowEditor<T extends Row>({
  row,
  index,
  count,
  specs,
  open,
  title,
  meta,
  reorderable,
  onToggle,
  onMove,
  onDelete,
  write,
  extra,
}: {
  row: T;
  index: number;
  count: number;
  specs: readonly FieldSpec[];
  open: boolean;
  title: string;
  meta?: ReactNode;
  reorderable: boolean;
  onToggle: () => void;
  onMove: (index: number, by: number) => void;
  onDelete: () => void;
  write: (payload: Draft) => Promise<Draft>;
  extra?: ReactNode;
}) {
  const form = useDraft(pick(specs, row as Draft), specs, write);

  return (
    <div className="cms-row" data-open={open}>
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 10 }}>
        <button className="cms-row-head" onClick={onToggle} aria-expanded={open}>
          <Chevron open={open} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title || <span style={{ color: cms.muted }}>Untitled</span>}
          </span>
          {form.dirty && (
            <span
              title="Unsaved changes"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: cms.cyan,
                flex: 'none',
              }}
            />
          )}
          {meta}
        </button>

        {reorderable && (
          <div style={{ display: 'flex', gap: 2, flex: 'none' }}>
            <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}>
              <Arrow direction="up" />
            </IconButton>
            <IconButton
              label="Move down"
              disabled={index === count - 1}
              onClick={() => onMove(index, 1)}
            >
              <Arrow direction="down" />
            </IconButton>
          </div>
        )}
      </div>

      {open && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            padding: '20px 18px 18px',
            borderTop: `1px solid ${cms.border}`,
          }}
        >
          <Fields specs={specs} draft={form.draft} onChange={form.set} />

          {extra}
          {form.error && <ErrorNote>{form.error}</ErrorNote>}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingTop: 4,
            }}
          >
            <DeleteButton onConfirm={onDelete} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SaveStatus state={form.state} error={form.error} />
              <Button
                variant="primary"
                size="sm"
                onClick={form.save}
                disabled={!form.dirty}
                busy={form.state === 'saving'}
              >
                {form.dirty ? 'Save' : 'Saved'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

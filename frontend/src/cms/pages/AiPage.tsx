/**
 * The ask bar's model: which one answers, what it is told, and what it said.
 *
 * Three things on one page because they are the three things you change
 * together. You read the log, notice an answer that missed, edit the prompt,
 * and ask again — so the log sits under the prompts rather than on a page of
 * its own.
 *
 * The provider and the API key are deliberately absent: they are `.env`, and a
 * key rendered into a form is a key in a screenshot. The header shows which
 * provider is configured and whether a key is present, which is all the CMS
 * needs to explain itself.
 */

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type AiModel, type AiSettingsRow, type AskLogPage, type AskLogRow } from '../api';
import { Fields, type FieldSpec } from '../fields';
import { useResource } from '../useResource';
import { useToast } from '../useToast';
import { Badge, Button, Card, ErrorNote, PageHeader, Spinner } from '../ui';
import { cms, message, mono } from '../tokens';

type Draft = Record<string, unknown>;

const MODES: FieldSpec['options'] = [
  { value: 'hybrid', label: 'Hybrid — written answer on an exact match, model otherwise' },
  { value: 'ai', label: 'AI — always ask the model' },
  { value: 'keyword', label: 'Keyword — never ask the model' },
];

/** Prepended to the model dropdowns so "provider default" stays reachable. */
const DEFAULT_OPTION = { value: '', label: 'Provider default' };

function relative(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function AiPage() {
  return (
    <>
      <PageHeader
        title="AI"
        description="Which model answers the ask bar, what it is told, and what visitors asked it."
      />
      <Settings />
      <LogPanel />
    </>
  );
}

// --------------------------------------------------------------------------- //
// Settings
// --------------------------------------------------------------------------- //

function Settings() {
  const { data, loading, error, reload } = useResource(() => api.ai.get());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [models, setModels] = useState<AiModel[]>([]);
  const [modelsError, setModelsError] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (data) setDraft({ ...(data as unknown as Draft) });
  }, [data]);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setModelsError('');
    try {
      setModels(await api.ai.models());
    } catch (err) {
      // A dead key and an empty catalogue look identical in a dropdown, so the
      // reason is shown rather than swallowed.
      setModelsError(message(err));
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const ready = Boolean(data?.provider_ready);
  useEffect(() => {
    if (ready) void loadModels();
  }, [ready, loadModels]);

  if (loading && !data) return <Spinner />;
  if (error) {
    return (
      <ErrorNote>
        {error} <Button size="sm" variant="ghost" onClick={reload}>Retry</Button>
      </ErrorNote>
    );
  }
  if (!data || !draft) return null;

  const row = data as AiSettingsRow;

  // Whatever is stored stays selectable even if the provider stopped listing it,
  // so opening this page can never silently change which model answers.
  const known = new Set(models.map((m) => m.id));
  const options = (value: string) => [
    DEFAULT_OPTION,
    ...(value && !known.has(value)
      ? [{ value, label: `${value} — not in the current list` }]
      : []),
    ...models.map((m) => ({ value: m.id, label: m.free ? m.label : `${m.label} (paid)` })),
  ];

  const specs: FieldSpec[] = [
    { name: 'mode', label: 'Mode', type: 'select', options: MODES, span: 2 },
    {
      name: 'model',
      label: 'Answering model',
      type: 'select',
      options: options(String(draft.model ?? '')),
      hint: loadingModels ? 'Loading the provider’s list…' : 'Writes the answer.',
    },
    {
      name: 'router_model',
      label: 'Routing model',
      type: 'select',
      options: options(String(draft.router_model ?? '')),
      hint: 'Only picks which tables to read, so a smaller model will do.',
    },
    {
      name: 'system_prompt',
      label: 'System prompt',
      type: 'textarea',
      rows: 12,
      span: 2,
      hint: 'Must contain {name}, replaced with the site owner’s name. Clear it to restore the shipped prompt.',
    },
    {
      name: 'user_prompt',
      label: 'User prompt',
      type: 'textarea',
      rows: 6,
      span: 2,
      hint: 'Must contain {context} and {question}. For a literal brace, write {{ or }}.',
    },
    {
      name: 'log_questions',
      label: 'Log questions',
      type: 'toggle',
      hint: 'Off stops recording what visitors type. The bar keeps working.',
    },
  ];

  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.ai.update({
        mode: draft.mode as AiSettingsRow['mode'],
        model: String(draft.model ?? ''),
        router_model: String(draft.router_model ?? ''),
        system_prompt: String(draft.system_prompt ?? ''),
        user_prompt: String(draft.user_prompt ?? ''),
        log_questions: Boolean(draft.log_questions),
      });
      toast.show('Saved');
      reload();
    } catch (err) {
      // A rejected prompt comes back as a 422 whose detail names the field.
      setSaveError(err instanceof ApiError ? err.message : message(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ marginBottom: 26 }}>
      {toast.element}

      <header
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}
      >
        <span style={{ ...mono, fontSize: 10, color: cms.muted }}>PROVIDER</span>
        <Badge tone={row.provider_ready ? 'ok' : 'off'}>{row.provider || 'not configured'}</Badge>
        <span style={{ color: cms.muted, fontSize: 12 }}>
          {row.provider_ready
            ? 'Set in backend/.env. The API key is never shown here.'
            : 'Set AI_PROVIDER and AI_API_KEY in backend/.env. Until then the written answers reply.'}
        </span>
        {row.provider_ready && (
          <span style={{ marginLeft: 'auto' }}>
            <Button size="sm" variant="ghost" busy={loadingModels} onClick={() => void loadModels()}>
              Refresh models
            </Button>
          </span>
        )}
      </header>

      {modelsError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorNote>Could not list models — {modelsError}</ErrorNote>
        </div>
      )}
      {saveError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorNote>{saveError}</ErrorNote>
        </div>
      )}

      <Fields
        specs={specs}
        draft={draft}
        onChange={(name, value) => setDraft({ ...draft, [name]: value })}
      />

      <footer style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <Button variant="primary" busy={saving} disabled={!dirty} onClick={() => void save()}>
          Save
        </Button>
        <Button
          variant="ghost"
          disabled={!dirty || saving}
          onClick={() => setDraft({ ...(data as unknown as Draft) })}
        >
          Discard
        </Button>
        <span style={{ marginLeft: 'auto' }}>
          <Button
            variant="ghost"
            onClick={() =>
              setDraft({
                ...draft,
                system_prompt: row.default_system_prompt,
                user_prompt: row.default_user_prompt,
              })
            }
          >
            Reset prompts to shipped
          </Button>
        </span>
      </footer>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// The log
// --------------------------------------------------------------------------- //

const PAGE = 25;

function LogPanel() {
  const [source, setSource] = useState('');
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<AskLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  // Fetched here rather than through `useResource`, which captures its loader
  // and reloads on demand — this list re-queries whenever the filter or the
  // offset moves.
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPage(await api.ai.logs({ limit: PAGE, offset, source }));
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }, [offset, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const filter = (next: string) => {
    setSource(next);
    setOffset(0);
  };

  const clear = async () => {
    if (!window.confirm('Delete every logged question? This cannot be undone.')) return;
    try {
      await api.ai.clearLogs();
      toast.show('Log cleared');
      setOffset(0);
      void load();
    } catch (err) {
      toast.show(message(err), 'error');
    }
  };

  const remove = async (id: number) => {
    try {
      await api.ai.deleteLog(id);
      void load();
    } catch (err) {
      toast.show(message(err), 'error');
    }
  };

  return (
    <Card>
      {toast.element}

      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 15, color: cms.text }}>Questions</h2>
        <span style={{ color: cms.muted, fontSize: 12, flex: 1, minWidth: 180 }}>
          {page
            ? `${page.total} asked · ${page.answered_by_model} answered by the model`
            : 'What visitors typed, and what came back.'}
        </span>
        {(['', 'model', 'written'] as const).map((value) => (
          <Button
            key={value || 'all'}
            size="sm"
            variant={source === value ? 'primary' : 'ghost'}
            onClick={() => filter(value)}
          >
            {value === '' ? 'All' : value === 'model' ? 'By model' : 'Fell back'}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => void clear()}>
          Clear
        </Button>
      </header>

      {error && (
        <div style={{ marginTop: 16 }}>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {loading && !page && <Spinner />}

      {page && page.items.length === 0 && (
        <p style={{ color: cms.muted, fontSize: 13, marginTop: 18 }}>
          {source === 'written'
            ? 'Nothing fell back — every question reached the model.'
            : 'No questions yet.'}
        </p>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        {page?.items.map((row) => (
          <LogEntry key={row.id} row={row} onDelete={() => void remove(row.id)} />
        ))}
      </div>

      {page && page.total > PAGE && (
        <footer style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18 }}>
          <Button
            size="sm"
            variant="ghost"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
          >
            Newer
          </Button>
          <span style={{ ...mono, fontSize: 10, color: cms.muted }}>
            {offset + 1}–{Math.min(offset + PAGE, page.total)} of {page.total}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={offset + PAGE >= page.total}
            onClick={() => setOffset(offset + PAGE)}
          >
            Older
          </Button>
        </footer>
      )}
    </Card>
  );
}

function LogEntry({ row, onDelete }: { row: AskLogRow; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <article
      style={{
        border: `1px solid ${cms.border}`,
        borderRadius: 4,
        padding: '12px 14px',
        background: cms.raised,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          style={{
            flex: 1,
            minWidth: 200,
            textAlign: 'left',
            background: 'none',
            border: 'none',
            padding: 0,
            color: cms.text,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {row.question}
        </button>
        <Badge tone={row.source === 'model' ? 'ok' : 'warn'}>{row.source}</Badge>
        <span style={{ ...mono, fontSize: 10, color: cms.muted }}>
          {row.ms}ms · {relative(row.created_at)}
        </span>
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete entry">
          ✕
        </Button>
      </div>

      <p
        style={{
          margin: '8px 0 0',
          color: cms.muted,
          fontSize: 12.5,
          lineHeight: 1.55,
          ...(open ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
        }}
      >
        {row.answer}
      </p>

      {open && (
        <dl
          style={{
            ...mono,
            fontSize: 10,
            color: cms.muted,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4px 12px',
            margin: '12px 0 0',
          }}
        >
          {row.model && (
            <>
              <dt>MODEL</dt>
              <dd style={{ margin: 0 }}>{row.model}</dd>
            </>
          )}
          {row.collections.length > 0 && (
            <>
              <dt>READ</dt>
              <dd style={{ margin: 0 }}>{row.collections.join(', ')}</dd>
            </>
          )}
          <dt>DELIVERY</dt>
          <dd style={{ margin: 0 }}>{row.streamed ? 'streamed' : 'whole'}</dd>
          {row.error && (
            <>
              <dt style={{ color: cms.danger }}>FELL BACK</dt>
              <dd style={{ margin: 0, color: cms.danger }}>{row.error}</dd>
            </>
          )}
        </dl>
      )}
    </article>
  );
}

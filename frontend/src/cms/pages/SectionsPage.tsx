/**
 * Section headings and the floating nav.
 *
 * Sections are addressed by their anchor key (`about`, `stack`, …) rather than a
 * numeric id, and the set is fixed by the page's markup — you cannot add a sixth
 * section from a form. So this is the one editor that is neither a singleton nor
 * a collection: a fixed list of small forms, each saving one row.
 */

import { useState } from 'react';
import { api, type SectionRow } from '../api';
import { CollectionEditor } from '../editors';
import { useResource } from '../useResource';
import { Fields, type FieldSpec } from '../fields';
import { contentChanged } from '../../live/store';
import { Badge, Button, Card, ErrorNote, PageHeader, SaveStatus, Spinner } from '../ui';
import { cms, type SaveState } from '../tokens';

const SECTION: FieldSpec[] = [
  { name: 'eyebrow', label: 'Eyebrow', placeholder: '01 / the person' },
  { name: 'heading', label: 'Heading', placeholder: 'I build the whole line.' },
];

const NAV: FieldSpec[] = [
  { name: 'label', label: 'Label', placeholder: 'About' },
  {
    name: 'visible',
    label: 'Visible',
    type: 'toggle',
    hint: 'Off removes the link without deleting it.',
  },
  { name: 'slug', label: 'Slug', hint: 'Matches a section key.', placeholder: 'about' },
  { name: 'href', label: 'Href', hint: 'Where the link scrolls to.', placeholder: '#about' },
];

function SectionCard({ section }: { section: SectionRow }) {
  const [saved, setSaved] = useState({ eyebrow: section.eyebrow, heading: section.heading });
  const [draft, setDraft] = useState(saved);
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const dirty = draft.eyebrow !== saved.eyebrow || draft.heading !== saved.heading;

  const save = async () => {
    setState('saving');
    setError(null);
    try {
      await api.sections.update(section.key, draft);
      setSaved(draft);
      setState('saved');
      contentChanged();
      window.setTimeout(() => setState('idle'), 1600);
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  };

  return (
    <Card style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Badge>#{section.key}</Badge>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SaveStatus state={state} error={error} />
          <Button size="sm" variant="primary" onClick={save} disabled={!dirty} busy={state === 'saving'}>
            {dirty ? 'Save' : 'Saved'}
          </Button>
        </div>
      </div>
      <Fields
        specs={SECTION}
        draft={draft}
        onChange={(name, value) => setDraft((prev) => ({ ...prev, [name]: value as string }))}
      />
      {error && (
        <div style={{ marginTop: 14 }}>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Card>
  );
}

export function SectionsPage() {
  const { data, loading, error } = useResource(() => api.sections.list());

  return (
    <>
      <PageHeader
        title="Sections & navigation"
        description="The eyebrow and heading above each scroll section, and the links in the floating nav. The sections themselves are fixed by the page."
      />

      {loading && !data && <Spinner />}
      {error && <ErrorNote>{error}</ErrorNote>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data?.map((section) => (
          <SectionCard key={section.key} section={section} />
        ))}
      </div>

      <div style={{ marginTop: 38, paddingTop: 30, borderTop: `1px solid ${cms.border}` }}>
        <CollectionEditor
          inline
          title="Navigation"
          description="Order here is order in the pill bar."
          specs={NAV}
          resource={api.nav}
          blank={() => ({ slug: 'new-link', label: 'New link', href: '#about', visible: false })}
          rowTitle={(row) => row.label}
          rowMeta={(row) => (
            <Badge tone={row.visible ? 'ok' : 'off'}>{row.visible ? 'Shown' : 'Hidden'}</Badge>
          )}
          addLabel="Add link"
          emptyLabel="No navigation links."
        />
      </div>
    </>
  );
}

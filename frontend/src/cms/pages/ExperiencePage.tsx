import { api } from '../api';
import { CollectionEditor } from '../editors';
import type { FieldSpec } from '../fields';
import { cms } from '../tokens';

const ROLE: FieldSpec[] = [
  { name: 'title', label: 'Title', placeholder: 'Full-Stack Engineer · Company', span: 2 },
  { name: 'period', label: 'Period', placeholder: '2024 — now', hint: 'Rendered in the accent mono type above the title.' },
  {
    name: 'body',
    label: 'What you did',
    type: 'textarea',
    rows: 4,
    placeholder: 'Owned the ingestion pipeline end to end…',
  },
];

const FOOTNOTE: FieldSpec[] = [
  {
    name: 'text',
    label: 'Line',
    span: 2,
    placeholder: 'License in Computer Science · Al Maaref University · 2019–2023',
  },
];

export function ExperiencePage() {
  return (
    <>
      <CollectionEditor
        title="Experience"
        description="The timeline. Top of the list is the top of the page — most recent first reads best."
        specs={ROLE}
        resource={api.roles}
        blank={() => ({ title: 'New role', period: '', body: '' })}
        rowTitle={(row) => row.title}
        rowMeta={(row) => <span style={{ color: cms.muted, fontSize: 12 }}>{row.period}</span>}
        addLabel="Add role"
        emptyLabel="No roles on the timeline yet."
      />

      <div style={{ marginTop: 38 }}>
        <CollectionEditor
          inline
          title="Footnotes"
          description="The education and languages lines under the timeline."
          specs={FOOTNOTE}
          resource={api.footnotes}
          blank={() => ({ text: 'New line' })}
          rowTitle={(row) => row.text}
          addLabel="Add line"
          emptyLabel="No footnotes."
        />
      </div>
    </>
  );
}

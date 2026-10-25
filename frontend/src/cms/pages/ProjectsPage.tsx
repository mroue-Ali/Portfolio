import { api } from '../api';
import { CollectionEditor } from '../editors';
import type { FieldSpec } from '../fields';
import { Badge } from '../ui';
import { cms } from '../tokens';

const SPECS: FieldSpec[] = [
  { name: 'title', label: 'Title', placeholder: 'Knowledge Base RAG System', span: 2 },
  { name: 'number', label: 'Card number', placeholder: '01', hint: 'Text, so the leading zero survives.' },
  {
    name: 'published',
    label: 'Published',
    type: 'toggle',
    hint: 'Off keeps the project here and takes it off the site.',
  },
  {
    name: 'summary',
    label: 'Summary',
    type: 'textarea',
    rows: 3,
    placeholder: 'Question answering over private document collections.',
    hint: 'One or two lines on the card in the grid.',
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    rows: 8,
    hint: 'The full write-up on the details view. Leave a blank line between paragraphs. A project with no screenshot leans on this.',
  },
  {
    name: 'points',
    label: 'Bullet points',
    type: 'list',
    rows: 2,
    hint: 'Highlights listed on the details view.',
    itemPlaceholder: 'Configurable ingestion with custom chunking…',
  },
  {
    name: 'tags',
    label: 'Tags',
    type: 'list',
    hint: 'Short technology labels shown along the bottom of the card.',
    itemPlaceholder: 'FastAPI',
  },
  {
    name: 'image',
    label: 'Screenshot',
    type: 'image',
    hint: 'Optional. Drop a capture here, or pick one you have already uploaded. Around 16:10 and at least 1600px wide fills the frame; a missing file leaves the frame empty rather than breaking.',
  },
  {
    name: 'link',
    label: 'Live site',
    placeholder: 'https://…',
    hint: 'Empty hides the site button on the details view.',
  },
  {
    name: 'repo',
    label: 'Repository',
    placeholder: 'https://github.com/…',
    hint: 'Empty hides the repo button.',
  },
  { name: 'link_label', label: 'Site button label', placeholder: 'Visit site' },
];

export function ProjectsPage() {
  return (
    <CollectionEditor
      title="Projects"
      description="Order here is the order of the grid on the site; unpublished projects stay in this list and disappear from the site. The eyebrow and heading above the grid live under Sections."
      specs={SPECS}
      resource={api.projects}
      blank={() => ({
        title: 'New project',
        number: '',
        summary: '',
        points: [],
        tags: [],
        published: false,
      })}
      rowTitle={(row) => `${row.number ? `${row.number} · ` : ''}${row.title}`}
      rowMeta={(row) => (
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {row.tags.length > 0 && (
            <span style={{ color: cms.muted, fontSize: 12 }}>{row.tags.length} tags</span>
          )}
          <Badge tone={row.published ? 'ok' : 'off'}>{row.published ? 'Live' : 'Draft'}</Badge>
        </span>
      )}
      addLabel="Add project"
      emptyLabel="No projects yet."
    />
  );
}

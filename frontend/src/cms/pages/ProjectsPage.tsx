import { api } from '../api';
import { CollectionEditor, SingletonEditor } from '../editors';
import type { FieldSpec } from '../fields';
import { Badge } from '../ui';
import { cms } from '../tokens';

const SECTION: FieldSpec[] = [
  {
    name: 'layout',
    label: 'Layout',
    type: 'select',
    span: 2,
    options: [
      { value: 'showcase', label: 'Showcase — pinned track, screenshot per project' },
      { value: 'list', label: 'Simple list — number, title, summary, tags' },
    ],
    hint: 'Showcase is the sideways-scrolling version: it wants a real screenshot and a link on every project. Simple list drops the images, leaves the bullet points out, and makes a row clickable only once it has a link — the one to stay on until the rest is ready. Switching costs nothing: the projects below are the same either way.',
  },
];

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
  },
  {
    name: 'points',
    label: 'Bullet points',
    type: 'list',
    rows: 2,
    hint: 'Shown in the showcase layout only.',
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
    hint: 'Showcase layout only. Drop a capture here, or pick one you have already uploaded. Around 16:10 and at least 1600px wide fills the frame; a missing file leaves the frame empty rather than breaking.',
  },
  {
    name: 'link',
    label: 'Link',
    placeholder: 'https://github.com/…',
    hint: 'In the simple list an entry without one is plain text rather than a dead link.',
  },
  { name: 'link_label', label: 'Link label', placeholder: 'Read the case study' },
];

export function ProjectsPage() {
  return (
    <SingletonEditor
      title="Selected work"
      description="How the section renders, and the projects in it. The eyebrow and heading above it live under Sections."
      specs={SECTION}
      resource={api.projectsContent}
    >
      <CollectionEditor
        inline
        title="Projects"
        description="Order here is the order on the page; unpublished projects stay in this list and disappear from the site."
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
    </SingletonEditor>
  );
}

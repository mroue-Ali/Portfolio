import { api } from '../api';
import { CollectionEditor, SingletonEditor } from '../editors';
import type { FieldSpec } from '../fields';
import { Badge } from '../ui';

const ABOUT: FieldSpec[] = [
  {
    name: 'paragraphs',
    label: 'Body copy',
    type: 'list',
    rows: 3,
    hint: 'One entry per paragraph. They render in this order, under the heading.',
    itemPlaceholder: 'Ingestion, chunking, vector search…',
  },
  {
    name: 'portrait_image',
    label: 'Portrait',
    type: 'image',
    hint: 'Square crops best — the frame is a circle. Empty keeps the placeholder text below.',
  },
  {
    name: 'portrait_placeholder',
    label: 'Portrait placeholder text',
    hint: 'Shown inside the circle while there is no image.',
    placeholder: 'portrait / drop image here',
  },
];

const STAT: FieldSpec[] = [
  { name: 'value', label: 'Value', type: 'number', hint: 'Counts up from zero when scrolled into view.' },
  { name: 'suffix', label: 'Suffix', placeholder: '+', hint: 'Rendered straight after the number.' },
  { name: 'label', label: 'Label', placeholder: 'years shipping', span: 2 },
];

export function AboutPage() {
  return (
    <SingletonEditor
      title="About"
      description="The body copy beside the portrait, and the three counters under it. The section's eyebrow and heading live under Sections."
      specs={ABOUT}
      resource={api.about}
    >
      <CollectionEditor
        inline
        title="Stats"
        description="The counters under the about copy. Order is left to right."
        specs={STAT}
        resource={api.stats}
        blank={() => ({ value: 0, suffix: '', label: 'New stat' })}
        rowTitle={(row) => row.label}
        rowMeta={(row) => (
          <Badge>
            {row.value}
            {row.suffix}
          </Badge>
        )}
        addLabel="Add stat"
        emptyLabel="No counters yet."
      />
    </SingletonEditor>
  );
}

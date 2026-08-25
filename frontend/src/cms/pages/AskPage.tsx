/**
 * The hero's ask bar: its settings, its written answers, and the retrieval
 * nodes an answer can light up.
 *
 * Answers are matched on keywords — an exact question match wins outright,
 * otherwise each matched keyword scores its own length, so a specific term beats
 * a generic one. Same scoring in the browser and on the server, which is why the
 * hints here talk about keywords rather than "training".
 */

import { api } from '../api';
import { CollectionEditor, SingletonEditor } from '../editors';
import type { FieldSpec } from '../fields';
import { Badge } from '../ui';
import { cms } from '../tokens';

const ASK: FieldSpec[] = [
  { name: 'placeholder', label: 'Placeholder', placeholder: 'Ask about my work…' },
  {
    name: 'question_limit',
    label: 'Questions per visit',
    type: 'number',
    hint: 'The bar locks after this many.',
  },
  {
    name: 'fallback',
    label: 'Fallback answer',
    type: 'textarea',
    rows: 3,
    hint: 'Used when nothing matches. Make it useful — it is the answer visitors are most likely to see.',
  },
];

const ANSWER: FieldSpec[] = [
  { name: 'question', label: 'Question', span: 2, placeholder: 'What have you built with RAG?' },
  { name: 'answer', label: 'Answer', type: 'textarea', rows: 4 },
  {
    name: 'keywords',
    label: 'Keywords',
    type: 'list',
    hint: 'Lowercase substrings matched against what the visitor typed.',
    itemPlaceholder: 'rag',
  },
  {
    name: 'is_chip',
    label: 'Suggestion chip',
    type: 'toggle',
    hint: 'Offered as a one-click question under the bar.',
  },
  { name: 'published', label: 'Published', type: 'toggle' },
];

export function AskPage() {
  return (
    <SingletonEditor
      title="Ask bar"
      description="The question box in the hero, and the answers behind it."
      specs={ASK}
      resource={api.ask}
    >
      <CollectionEditor
        inline
        title="Answers"
        description="Matched on keywords, in this order when two answers tie."
        specs={ANSWER}
        resource={api.answers}
        blank={() => ({
          question: 'New question',
          answer: '',
          keywords: [],
          is_chip: false,
          published: false,
        })}
        rowTitle={(row) => row.question}
        rowMeta={(row) => (
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {row.keywords.length > 0 && (
              <span style={{ color: cms.muted, fontSize: 12 }}>{row.keywords.length} keywords</span>
            )}
            {row.is_chip && <Badge tone="warn">Chip</Badge>}
            <Badge tone={row.published ? 'ok' : 'off'}>{row.published ? 'Live' : 'Draft'}</Badge>
          </span>
        )}
        addLabel="Add answer"
        emptyLabel="No written answers yet — the fallback would handle every question."
      />

    </SingletonEditor>
  );
}

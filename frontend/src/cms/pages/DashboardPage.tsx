/**
 * What is on the site right now, at a glance.
 *
 * Built from the public payload rather than a dozen admin calls: it is one
 * request, and it shows exactly what a visitor would get — including anything
 * left unpublished, which is the number worth noticing.
 */

import type { SiteContent } from '../../content';
import { request } from '../api';
import { useResource } from '../useResource';
import { navigate } from '../router';
import { useSession } from '../session';
import { Badge, Button, Card, ErrorNote, PageHeader, Spinner } from '../ui';
import { cms, mono } from '../tokens';

type Tile = { label: string; value: string | number; note?: string; to: string };

function Tiles({ content }: { content: SiteContent }) {
  const tiles: Tile[] = [
    {
      label: 'Projects',
      value: content.projects.items.length,
      note: 'published',
      to: '/admin/projects',
    },
    { label: 'Stack groups', value: content.stack.groups.length, to: '/admin/stack' },
    {
      label: 'Tools',
      value: content.stack.groups.reduce((n, group) => n + group.tiles.length, 0),
      to: '/admin/stack',
    },
    { label: 'Timeline', value: content.experience.roles.length, note: 'roles', to: '/admin/experience' },
    { label: 'Stats', value: content.about.stats.length, to: '/admin/about' },
    { label: 'Answers', value: content.answers.length, note: 'published', to: '/admin/ask' },
    { label: 'Nav links', value: content.nav.length, note: 'visible', to: '/admin/sections' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
        gap: 12,
      }}
    >
      {tiles.map((tile) => (
        <button
          key={tile.label}
          className="cms-row"
          onClick={() => navigate(tile.to)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '18px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'inherit',
            font: 'inherit',
          }}
        >
          <span
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: 30,
              letterSpacing: '-0.02em',
            }}
          >
            {tile.value}
          </span>
          <span style={{ ...mono, color: cms.muted, fontSize: 10 }}>
            {tile.label}
            {tile.note ? ` · ${tile.note}` : ''}
          </span>
        </button>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useSession();
  const { data, loading, error } = useResource(() =>
    request<SiteContent>('/api/content', { auth: false }),
  );

  return (
    <>
      <PageHeader
        title={`Hello${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Everything on the portfolio is editable here, or on the page itself — open the site while signed in and switch on edit mode."
        actions={
          <Button variant="primary" onClick={() => window.open('/?edit=1', '_blank')}>
            Open site in edit mode
          </Button>
        }
      />

      {loading && !data && <Spinner label="Reading the site" />}
      {error && (
        <ErrorNote>
          Could not read the content API ({error}). The CMS can still save, but the numbers below
          are missing.
        </ErrorNote>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <Tiles content={data} />

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ ...mono, color: cms.muted }}>Live copy</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Line label="Name">{data.profile.name}</Line>
                <Line label="Role">{data.profile.role}</Line>
                <Line label="Availability">{data.profile.availability}</Line>
                <Line label="Hero intro">{data.profile.intro}</Line>
                <Line label="Ask limit">
                  <Badge>{data.ask.limit} questions per visit</Badge>
                </Line>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ ...mono, color: cms.muted, fontSize: 10, width: 110, flex: 'none' }}>
        {label}
      </span>
      <span style={{ flex: 1, minWidth: 220, lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

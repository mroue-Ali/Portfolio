/**
 * Stack groups, each with its own tiles.
 *
 * Tiles live in their own table keyed by `group_id`, so the nested editor gets a
 * client whose `list` is filtered and whose `create` fills the foreign key in —
 * the same `CollectionEditor` as everywhere else, pointed at a slice. It has to
 * be memoised per group: `useResource` reloads whenever the client identity
 * changes, and a fresh object every render would fetch forever.
 */

import { useMemo } from 'react';
import { api, type Collection, type StackTileRow } from '../api';
import { CollectionEditor } from '../editors';
import type { FieldSpec } from '../fields';
import { ICON_PATHS } from '../../content/icons';
import { Badge } from '../ui';
import { cms } from '../tokens';

const GROUP: FieldSpec[] = [
  { name: 'name', label: 'Group name', placeholder: 'Backend & Data', span: 2 },
  {
    name: 'pills',
    label: 'Extras',
    type: 'list',
    hint: 'Text-only entries listed under the tiles, for things without an icon.',
    itemPlaceholder: 'Alembic',
  },
];

const TILE: FieldSpec[] = [
  { name: 'name', label: 'Name', placeholder: 'FastAPI' },
  {
    name: 'icon',
    label: 'Icon slug',
    placeholder: 'fastapi',
    hint: 'A simple-icons slug. Run `node scripts/generate-icons.mjs` after adding one that is not already bundled.',
  },
  { name: 'color', label: 'Brand colour', type: 'color', hint: 'Revealed on hover.' },
  {
    name: 'where_used',
    label: 'Where you used it',
    placeholder: 'Knowledge base API',
    hint: 'Kept as data — not rendered on the tile.',
  },
];

function TileIcon({ slug, color }: { slug: string; color: string }) {
  const path = ICON_PATHS[slug];
  if (!path) {
    return (
      <Badge tone="warn" >
        no icon
      </Badge>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ flex: 'none' }}>
      <path d={path} fill={color || cms.text} />
    </svg>
  );
}

function GroupTiles({ groupId, groupName }: { groupId: number; groupName: string }) {
  const resource = useMemo<Collection<StackTileRow>>(
    () => ({
      ...api.stackTiles,
      list: async () =>
        (await api.stackTiles.list()).filter((tile) => tile.group_id === groupId),
    }),
    [groupId],
  );

  return (
    <div style={{ borderTop: `1px solid ${cms.border}`, paddingTop: 20 }}>
      <CollectionEditor
        inline
        title="Tiles"
        description={`The icons shown under “${groupName}”.`}
        specs={TILE}
        resource={resource}
        blank={() => ({
          group_id: groupId,
          name: 'New tool',
          icon: '',
          color: '#E9ECF0',
          where_used: '',
        })}
        rowTitle={(row) => row.name}
        rowMeta={(row) => <TileIcon slug={row.icon} color={row.color} />}
        addLabel="Add tile"
        emptyLabel="No tiles in this group yet."
      />
    </div>
  );
}

export function StackPage() {
  return (
    <CollectionEditor
      title="Stack"
      description="Tools, grouped. Each group is a row of tiles plus any text-only extras; the marquee at the bottom of the section draws from every tile."
      specs={GROUP}
      resource={api.stackGroups}
      blank={() => ({ name: 'New group', pills: [] })}
      rowTitle={(row) => row.name}
      rowMeta={(row) => (
        <span style={{ color: cms.muted, fontSize: 12 }}>
          {row.tiles?.length ?? 0} tiles
        </span>
      )}
      addLabel="Add group"
      emptyLabel="No stack groups yet."
      rowExtra={(row) => <GroupTiles groupId={row.id} groupName={row.name} />}
    />
  );
}

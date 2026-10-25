import { stack } from '../content';
import { ICON_PATHS } from '../content/icons';
import { Editable } from '../live/Editable';
import { edit } from '../live/bindings';
import { color, contrast, dataText, metaText, monoLabel, sectionHeading } from '../theme';

/**
 * A tool's brand colour, unless it would disappear on the tile.
 *
 * Brand colours are whatever the brand chose: Django's green is nearly black and
 * Expo's mark is nearly white, so one of them vanishes on any given ground. Below
 * 2:1 against the surface the hover falls back to the text colour.
 */
const hoverColour = (brand: string) =>
  contrast(brand, color.surface) < 2 ? color.text : brand;

export function Stack() {
  return (
    <section
      id="stack"
      style={{
        position: 'relative',
        zIndex: 10,
        padding: '140px 0',
        borderTop: `1px solid ${color.border}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '0 6vw' }}>
        <div
          data-reveal
          style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 66 }}
        >
          <Editable bind={edit.section('stack', 'eyebrow')} as="div" style={monoLabel} />
          <Editable bind={edit.section('stack', 'heading')} as="h2" style={sectionHeading} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
          {stack.groups.map((group, groupIndex) => (
            <div
              key={group.id ?? groupIndex}
              style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Editable
                  bind={edit.stack.groupName(group)}
                  style={{ ...metaText, fontWeight: 500, color: color.text, whiteSpace: 'nowrap' }}
                />
                <span style={{ flex: 1, height: 1, background: color.border }} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
                  gap: 10,
                }}
              >
                {group.tiles.map((tile, tileIndex) => (
                  <div
                    key={tile.id ?? tileIndex}
                    className="tile"
                    style={
                      {
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        padding: '20px 8px',
                        borderRadius: 4,
                        background: color.surface,
                        cursor: 'default',
                        // Read by .tile:hover svg to reveal the brand colour.
                        '--brand': hoverColour(tile.color),
                      } as React.CSSProperties
                    }
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                      <path d={ICON_PATHS[tile.icon] ?? ''} fill="currentColor" />
                    </svg>
                    <Editable
                      bind={edit.stack.tileName(tile)}
                      style={{ ...metaText, fontSize: 13, lineHeight: 1.3, textAlign: 'center' }}
                    />
                  </div>
                ))}
              </div>

              {group.pills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {group.pills.map((pill, pillIndex) => (
                    <Editable
                      key={`${pill}-${pillIndex}`}
                      bind={edit.stack.pill(group, pillIndex)}
                      style={{
                        ...dataText,
                        padding: '6px 11px',
                        border: `1px dashed ${color.border}`,
                        borderRadius: 999,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

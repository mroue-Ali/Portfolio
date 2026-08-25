import { stack } from '../content';
import { ICON_PATHS } from '../content/icons';
import { Editable } from '../live/Editable';
import { edit } from '../live/bindings';
import { color, font, monoLabel, sectionHeading } from '../theme';

export function Stack() {
  // The marquee shows every tool once per row, split so the two rows differ.
  const allTiles = stack.groups.flatMap((g) => g.tiles);
  const half = Math.ceil(allTiles.length / 2);
  const rowA = allTiles.slice(0, half);
  const rowB = allTiles.slice(half);

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
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: color.muted,
                    whiteSpace: 'nowrap',
                  }}
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
                        '--brand': tile.color,
                      } as React.CSSProperties
                    }
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                      <path d={ICON_PATHS[tile.icon] ?? ''} fill="currentColor" />
                    </svg>
                    <Editable
                      bind={edit.stack.tileName(tile)}
                      style={{
                        fontFamily: font.mono,
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: color.muted,
                        textAlign: 'center',
                        lineHeight: 1.3,
                      }}
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
                        padding: '6px 11px',
                        border: `1px dashed ${color.border}`,
                        borderRadius: 999,
                        fontFamily: font.mono,
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: color.muted,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sliding icon band closing the section. Each row renders its group twice
          at identical width, so a -50% shift lands exactly one group over and
          loops with no seam. GSAP drives it (see useSiteAnimations) rather than
          a CSS keyframe, so the two rows share the page's ticker. */}
      <div aria-hidden="true" className="mq-stage">
        {[
          { row: rowA, dir: 'left', seconds: 26 },
          { row: rowB, dir: 'right', seconds: 34 },
        ].map(({ row, dir, seconds }) => (
          <div key={dir} className="mq-viewport">
            <div className="marquee" data-marquee={dir} data-marquee-seconds={seconds}>
              {[0, 1].map((copy) => (
                <div key={copy} className="mq-group">
                  {row.map((tile, i) => (
                    <svg
                      key={`${tile.name}-${i}`}
                      viewBox="0 0 24 24"
                      width="72"
                      height="72"
                      style={{ flex: 'none', color: color.text }}
                    >
                      <path d={ICON_PATHS[tile.icon] ?? ''} fill="currentColor" />
                    </svg>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}

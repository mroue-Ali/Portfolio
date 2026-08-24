import { stack } from '../content';
import { ICON_PATHS } from '../content/icons';
import { color, font, monoLabel, sectionHeading } from '../theme';

export function Stack() {
  // The marquee shows every tool once per row, doubled so the loop is seamless.
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
          <div style={monoLabel}>{stack.eyebrow}</div>
          <h2 style={sectionHeading}>{stack.heading}</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
          {stack.groups.map((group) => (
            <div key={group.name} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: color.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.name}
                </span>
                <span style={{ flex: 1, height: 1, background: color.border }} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
                  gap: 10,
                }}
              >
                {group.tiles.map((tile) => (
                  <div
                    key={tile.name}
                    className="tile"
                    data-cursor="link"
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
                    <span
                      style={{
                        fontFamily: font.mono,
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: color.muted,
                        textAlign: 'center',
                        lineHeight: 1.3,
                      }}
                    >
                      {tile.name}
                    </span>
                    <span
                      className="tile-tip"
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '5px 9px',
                        border: `1px solid ${color.border}`,
                        borderRadius: 3,
                        background: color.bg,
                        color: color.text,
                        fontFamily: font.mono,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 5,
                      }}
                    >
                      {tile.name} — {tile.where}
                    </span>
                  </div>
                ))}
              </div>

              {group.pills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {group.pills.map((pill) => (
                    <span
                      key={pill}
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
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden="true" style={{ marginTop: 96, display: 'flex', flexDirection: 'column', gap: 30 }}>
        {[
          { row: rowA, animation: 'mq-a 46s linear infinite' },
          { row: rowB, animation: 'mq-b 64s linear infinite' },
        ].map(({ row, animation }, r) => (
          <div key={r} style={{ overflow: 'hidden' }}>
            <div
              className="marquee"
              style={{ display: 'flex', gap: 74, width: 'max-content', opacity: 0.08, animation }}
            >
              {[...row, ...row].map((tile, i) => (
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
          </div>
        ))}
      </div>
    </section>
  );
}

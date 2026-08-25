import { experience } from '../content';
import { Editable } from '../live/Editable';
import { edit } from '../live/bindings';
import { color, font, monoLabel, sectionHeading } from '../theme';

export function Experience() {
  return (
    <section
      id="experience"
      style={{
        position: 'relative',
        zIndex: 10,
        padding: '140px 6vw',
        borderTop: `1px solid ${color.border}`,
      }}
    >
      <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto' }}>
        <div
          data-reveal
          style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 76 }}
        >
          <Editable bind={edit.section('experience', 'eyebrow')} as="div" style={monoLabel} />
          <Editable bind={edit.section('experience', 'heading')} as="h2" style={sectionHeading} />
        </div>

        <div data-timeline style={{ position: 'relative', paddingLeft: 42 }}>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 6,
              bottom: 6,
              width: 2,
              background: color.border,
            }}
          />
          {/* Drawn in as the section scrolls past. */}
          <div
            data-timeline-fill
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 6,
              bottom: 6,
              width: 2,
              background: 'linear-gradient(180deg, #7B68FA, #45D9EF)',
              transform: 'scaleY(0)',
              transformOrigin: 'top center',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 62 }}>
            {experience.roles.map((role, i) => (
              <div key={role.id ?? i} data-entry style={{ position: 'relative' }}>
                <span
                  data-dot
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: -47,
                    top: 5,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: `1px solid ${color.border}`,
                    background: color.bg,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Editable
                    bind={edit.role.period(role)}
                    as="div"
                    style={{
                      fontFamily: font.mono,
                      fontSize: 11,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: color.cyan,
                    }}
                  />
                  <Editable
                    bind={edit.role.title(role)}
                    as="h3"
                    style={{
                      margin: 0,
                      fontFamily: font.display,
                      fontWeight: 500,
                      fontSize: 24,
                      letterSpacing: '-0.02em',
                    }}
                  />
                  <Editable
                    bind={edit.role.body(role)}
                    as="p"
                    style={{
                      margin: 0,
                      maxWidth: '66ch',
                      fontSize: 17,
                      lineHeight: 1.65,
                      color: color.muted,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          data-reveal
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 34px',
            marginTop: 76,
            paddingTop: 30,
            borderTop: `1px solid ${color.border}`,
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: color.muted,
          }}
        >
          {experience.footnotes.map((note, i) => (
            <Editable key={note.id ?? i} bind={edit.footnote(note)} />
          ))}
        </div>
      </div>
    </section>
  );
}

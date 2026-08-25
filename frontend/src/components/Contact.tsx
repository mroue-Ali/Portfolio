import { profile } from '../content';
import { Editable } from '../live/Editable';
import { edit } from '../live/bindings';
import { color, font, monoLabel } from '../theme';

const fieldLabel = {
  fontFamily: font.mono,
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: color.muted,
};

const linkStyle = {
  padding: '14px 20px',
  borderRadius: 3,
  fontFamily: font.mono,
  fontSize: 11,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
};

export function Contact() {
  return (
    <section
      id="contact"
      style={{
        position: 'relative',
        zIndex: 10,
        padding: '160px 6vw 70px',
        borderTop: `1px solid ${color.border}`,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 54,
        }}
      >
        <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <Editable bind={edit.section('contact', 'eyebrow')} as="div" style={monoLabel} />
          <Editable
            bind={edit.section('contact', 'heading')}
            as="h2"
            style={{
              margin: 0,
              maxWidth: '20ch',
              fontFamily: font.display,
              fontWeight: 600,
              fontSize: 'clamp(36px, 6vw, 64px)',
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
            }}
          />
        </div>

        {/* Address and CTA share one row: the email reads as a labelled field
            rather than a second headline competing with the one above it. */}
        <div
          data-reveal
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '32px 40px',
            paddingBottom: 30,
            borderBottom: `1px solid ${color.border}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <span style={fieldLabel}>Email</span>
            <a
              href={`mailto:${profile.email}`}
              className="sweep"
              data-cursor="link"
              style={{
                position: 'relative',
                alignSelf: 'flex-start',
                maxWidth: '100%',
                fontFamily: font.display,
                fontWeight: 500,
                fontSize: 'clamp(21px, 2.6vw, 32px)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              <Editable bind={edit.profile.email()} />
              <span
                className="sweep-line"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -6,
                  height: 2,
                  background: `linear-gradient(90deg, ${color.accent}, ${color.accentAlt})`,
                }}
              />
            </a>
          </div>

          <a
            data-magnetic
            href={`mailto:${profile.email}`}
            data-cursor="link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '17px 28px',
              border: `1px solid ${color.accent}`,
              borderRadius: 3,
              background: color.surface,
              color: color.text,
              fontFamily: font.mono,
              fontSize: 12,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              willChange: 'transform',
            }}
          >
            <Editable bind={edit.contact.cta()} />
            <span aria-hidden="true" style={{ color: color.accentAlt }}>
              →
            </span>
          </a>
        </div>

        <div
          data-reveal
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 26,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={fieldLabel}>Phone</span>
            <a
              href={profile.phoneHref}
              className="contact-link"
              data-cursor="link"
              style={linkStyle}
            >
              <Editable bind={edit.profile.phone()} />
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={fieldLabel}>Elsewhere</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                className="contact-link"
                data-cursor="link"
                style={linkStyle}
              >
                LinkedIn
              </a>
              <a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                className="contact-link"
                data-cursor="link"
                style={linkStyle}
              >
                GitHub
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={fieldLabel}>Based in</span>
            <Editable
              bind={edit.profile.availability()}
              style={{
                ...linkStyle,
                border: `1px solid transparent`,
                paddingLeft: 0,
                color: color.muted,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 30px',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingTop: 26,
            borderTop: `1px solid ${color.border}`,
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: color.muted,
          }}
        >
          <Editable bind={edit.contact.colophon()} />
          <Editable bind={edit.contact.place()} />
        </div>
      </div>
    </section>
  );
}

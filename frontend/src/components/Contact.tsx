import { contact, profile } from '../content';
import { color, font, monoLabel } from '../theme';

const linkStyle = {
  padding: '17px 24px',
  borderRadius: 3,
  fontFamily: font.mono,
  fontSize: 12,
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
          <div style={monoLabel}>{contact.eyebrow}</div>
          <h2
            style={{
              margin: 0,
              maxWidth: '20ch',
              fontFamily: font.display,
              fontWeight: 600,
              fontSize: 'clamp(38px, 7vw, 72px)',
              lineHeight: 0.98,
              letterSpacing: '-0.03em',
            }}
          >
            {contact.heading}
          </h2>
        </div>

        <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
          <a
            href={`mailto:${profile.email}`}
            className="sweep"
            data-cursor="link"
            style={{
              position: 'relative',
              alignSelf: 'flex-start',
              fontFamily: font.display,
              fontWeight: 500,
              fontSize: 'clamp(26px, 4.6vw, 56px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              wordBreak: 'break-word',
            }}
          >
            {profile.email}
            <span
              className="sweep-line"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -6,
                height: 2,
                background: 'linear-gradient(90deg, #7B68FA, #45D9EF)',
              }}
            />
          </a>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <a
              data-magnetic
              href={`mailto:${profile.email}`}
              data-cursor="link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '17px 28px',
                border: `1px solid ${color.violet}`,
                borderRadius: 3,
                background: color.surface,
                color: color.text,
                fontFamily: font.mono,
                fontSize: 12,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                willChange: 'transform',
              }}
            >
              <span>{contact.cta}</span>
              <span aria-hidden="true" style={{ color: color.cyan }}>
                →
              </span>
            </a>
            <a href={profile.phoneHref} className="contact-link" data-cursor="link" style={linkStyle}>
              {profile.phone}
            </a>
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

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 30px',
            justifyContent: 'space-between',
            marginTop: 40,
            paddingTop: 26,
            borderTop: `1px solid ${color.border}`,
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: color.muted,
          }}
        >
          <span>{contact.colophon}</span>
          <span>{contact.place}</span>
        </div>
      </div>
    </section>
  );
}

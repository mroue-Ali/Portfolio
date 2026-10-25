import { about, assetUrl, profile } from '../content';
import { Editable } from '../live/Editable';
import { ImageDrop } from '../live/ImageDrop';
import { edit } from '../live/bindings';
import { color, font, metaText, monoLabel, sectionHeading } from '../theme';

export function About() {
  return (
    <section
      id="about"
      style={{
        position: 'relative',
        zIndex: 10,
        padding: '140px 6vw',
        borderTop: `1px solid ${color.border}`,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 72,
          alignItems: 'start',
        }}
      >
        <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 380, aspectRatio: '1' }}>
            {/* A still hairline a little off the frame. It used to be a gradient
                arc spinning round the portrait, which pulled the eye off the face. */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: -14,
                borderRadius: '50%',
                border: `1px solid ${color.border}`,
              }}
            />
            <div
              data-portrait
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                background: `linear-gradient(160deg, ${color.surface}, ${color.bg})`,
                border: `1px solid ${color.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* The placeholder is what the frame says until there is a
                  portrait; once there is one it fills the circle. */}
              {about.portraitImage ? (
                <img
                  src={assetUrl(about.portraitImage)}
                  alt={profile.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Editable
                  bind={edit.about.portraitPlaceholder()}
                  style={{ ...metaText, textAlign: 'center', padding: '0 30px' }}
                />
              )}
              <ImageDrop bind={edit.about.portrait()} />
            </div>
          </div>
        </div>

        <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <Editable bind={edit.section('about', 'eyebrow')} as="div" style={monoLabel} />
          <Editable bind={edit.section('about', 'heading')} as="h2" style={sectionHeading} />
          {about.paragraphs.map((_, i) => (
            <Editable
              key={i}
              bind={edit.about.paragraph(i)}
              as="p"
              style={{
                margin: 0,
                fontSize: 17,
                lineHeight: 1.65,
                color: color.muted,
                maxWidth: '58ch',
              }}
            />
          ))}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 20,
              marginTop: 10,
              paddingTop: 30,
              borderTop: `1px solid ${color.border}`,
            }}
          >
            {about.stats.map((stat, i) => (
              <div key={stat.id ?? i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    fontFamily: font.display,
                    fontWeight: 600,
                    fontSize: 40,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {/* The real figure from the first frame. Counting up from zero is
                      the stat banner every template ships with. */}
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {stat.value.toLocaleString('en-US')}
                    {stat.suffix}
                  </span>
                </div>
                <Editable bind={edit.about.statLabel(stat)} as="div" style={metaText} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

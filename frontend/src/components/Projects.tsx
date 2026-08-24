import { projects } from '../content';
import { color, font, gradient, monoLabel, sectionHeading, textGradient } from '../theme';

/**
 * Horizontally scrolling case studies.
 *
 * On desktop the track is pinned and driven by scroll (see useSiteAnimations);
 * below 900px it falls back to a stacked column.
 */
export function Projects() {
  return (
    <section
      id="projects"
      style={{
        position: 'relative',
        zIndex: 10,
        borderTop: `1px solid ${color.border}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '140px 6vw 0', maxWidth: 1180, margin: '0 auto' }}>
        <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={monoLabel}>{projects.eyebrow}</div>
          <h2 style={sectionHeading}>{projects.heading}</h2>
        </div>
      </div>

      <div data-pin style={{ padding: '72px 0 140px' }}>
        <div
          data-track
          style={{
            display: 'flex',
            gap: 28,
            padding: '0 6vw',
            width: 'max-content',
            willChange: 'transform',
          }}
        >
          {projects.items.map((project) => (
            <article
              key={project.number}
              data-card
              style={{
                position: 'relative',
                flex: 'none',
                width: 'min(88vw, 620px)',
                padding: '44px 40px',
                border: `1px solid ${color.border}`,
                borderRadius: 4,
                background: color.surface,
                overflow: 'hidden',
              }}
            >
              {/* Oversized index bleeding off the bottom-right corner. */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: 18,
                  bottom: -34,
                  fontFamily: font.display,
                  fontWeight: 600,
                  fontSize: 220,
                  lineHeight: 1,
                  letterSpacing: '-0.05em',
                  opacity: 0.06,
                  pointerEvents: 'none',
                  ...textGradient(gradient.brand),
                }}
              >
                {project.number}
              </span>

              <div
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    letterSpacing: '0.15em',
                    color: color.muted,
                  }}
                >
                  {project.number}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: font.display,
                    fontWeight: 500,
                    fontSize: 'clamp(28px, 3.4vw, 40px)',
                    lineHeight: 1.08,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {project.title}
                </h3>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: color.text }}>
                  {project.summary}
                </p>

                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 11,
                  }}
                >
                  {project.points.map((point, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 15,
                        lineHeight: 1.55,
                        color: color.muted,
                        paddingLeft: 16,
                        borderLeft: `1px solid ${color.border}`,
                      }}
                    >
                      {point}
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '5px 10px',
                        border: `1px solid ${color.border}`,
                        borderRadius: 999,
                        fontFamily: font.mono,
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: color.muted,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

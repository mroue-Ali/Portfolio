import { assetUrl, projects } from '../content';
import { Editable } from '../live/Editable';
import { ImageDrop } from '../live/ImageDrop';
import { edit } from '../live/bindings';
import { color, font, gradient, monoLabel, sectionHeading, textGradient } from '../theme';

/**
 * Horizontally scrolling case studies.
 *
 * Each entry is a pair: a text panel holding ~37% of the width, and the
 * project's screenshot filling the space beside it. The pair travels together
 * as the pinned track scrolls (see useSiteAnimations), and the screenshot pops
 * in as it enters. Below 900px the pair stacks and the track becomes a column.
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
          <Editable bind={edit.section('projects', 'eyebrow')} as="div" style={monoLabel} />
          <Editable bind={edit.section('projects', 'heading')} as="h2" style={sectionHeading} />
        </div>
      </div>

      <div data-pin style={{ padding: '72px 0 140px' }}>
        <div
          data-track
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 64,
            padding: '0 6vw',
            width: 'max-content',
            willChange: 'transform',
          }}
        >
          {projects.items.map((project, projectIndex) => (
            <a
              key={project.id ?? projectIndex}
              data-card
              className="project-card"
              href={project.link}
              target="_blank"
              rel="noreferrer"
              data-cursor="link"
              aria-label={`${project.title} — ${project.linkLabel}`}
              style={{
                flex: 'none',
                display: 'flex',
                alignItems: 'stretch',
                gap: 28,
                width: 'min(88vw, 1400px)',
                color: color.text,
              }}
            >
              <article
                className="project-panel"
                style={{
                  position: 'relative',
                  flex: '0 0 clamp(340px, 31vw, 470px)',
                  padding: '44px 40px',
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
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  <Editable
                    bind={edit.project.number(project)}
                    as="div"
                    style={{
                      fontFamily: font.mono,
                      fontSize: 11,
                      letterSpacing: '0.15em',
                      color: color.muted,
                    }}
                  />
                  <Editable
                    bind={edit.project.title(project)}
                    as="h3"
                    style={{
                      margin: 0,
                      fontFamily: font.display,
                      fontWeight: 500,
                      fontSize: 'clamp(26px, 2.6vw, 34px)',
                      lineHeight: 1.08,
                      letterSpacing: '-0.03em',
                    }}
                  />
                  <Editable
                    bind={edit.project.summary(project)}
                    as="p"
                    style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: color.text }}
                  />

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
                    {project.points.map((_, i) => (
                      <Editable
                        key={i}
                        bind={edit.project.point(project, i)}
                        as="li"
                        style={{
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: color.muted,
                          paddingLeft: 16,
                          borderLeft: `1px solid ${color.border}`,
                        }}
                      />
                    ))}
                  </ul>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {project.tags.map((tag, i) => (
                      <Editable
                        key={`${tag}-${i}`}
                        bind={edit.project.tag(project, i)}
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
                      />
                    ))}
                  </div>

                  <span
                    className="card-cta"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: 6,
                      fontFamily: font.mono,
                      fontSize: 11,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Editable bind={edit.project.linkLabel(project)} />
                    <span className="card-cta-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </div>
              </article>

              {/* Fills whatever the panel leaves. GSAP pops it in on entry. */}
              <figure data-shot className="project-shot">
                <img
                  className="shot-img"
                  src={assetUrl(project.image)}
                  alt={`${project.title} screenshot`}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // No file there — drop out so the empty frame shows instead.
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <figcaption className="shot-caption">{project.title}</figcaption>
                {/* Edit mode only; renders nothing for a visitor. */}
                <ImageDrop bind={edit.project.image(project)} />
              </figure>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl, projects, type Project } from '../content';
import { Editable } from '../live/Editable';
import { ImageDrop } from '../live/ImageDrop';
import { edit } from '../live/bindings';
import { useEditMode } from '../live/mode';
import { lockScroll } from '../lib/scroll';
import { color, dataText, font, monoLabel, sectionHeading } from '../theme';

/**
 * Selected work: a grid of cards, each opening a details view.
 *
 * A card is the overview — cover image, title, summary. Everything else (the
 * write-up, the highlights, the site and repo links) lives in the details view,
 * so a project with no screenshot is still a full entry: its card shows a
 * typographic cover instead, and its details carry the explanation.
 *
 * The open project is mirrored in the URL hash (`#project-02`), so the back
 * button closes it and a link to one project can be shared.
 */
export function Projects() {
  const [open, setOpen] = useState<Project | null>(null);
  // True when the hash entry was pushed from the grid, so closing can step back
  // over it instead of leaving it in history.
  const pushed = useRef(false);

  useEffect(() => {
    const sync = () => {
      const match = /^#project-(.+)$/.exec(window.location.hash);
      if (!match) pushed.current = false;
      setOpen(match ? (projects.items.find((p) => slug(p) === match[1]) ?? null) : null);
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const show = (project: Project) => {
    pushed.current = true;
    window.history.pushState(null, '', `#project-${slug(project)}`);
    setOpen(project);
  };

  const close = () => {
    if (pushed.current) {
      window.history.back();
    } else {
      // Arrived on a shared link: there is nothing behind it to go back to.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setOpen(null);
    }
  };

  return (
    <section
      id="projects"
      style={{ position: 'relative', zIndex: 10, borderTop: `1px solid ${color.border}` }}
    >
      <div style={{ padding: '140px 6vw', maxWidth: 1240, margin: '0 auto' }}>
        <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Editable bind={edit.section('projects', 'eyebrow')} as="div" style={monoLabel} />
          <Editable bind={edit.section('projects', 'heading')} as="h2" style={sectionHeading} />
        </div>

        <ul className="project-grid">
          {projects.items.map((project, i) => (
            <li key={project.id ?? i} data-card>
              <ProjectCard project={project} onOpen={() => show(project)} />
            </li>
          ))}
        </ul>
      </div>

      {open && <ProjectDetails project={open} onClose={close} />}
    </section>
  );
}

/** The card number when it has one, else the list position — what the hash names. */
const slug = (project: Project) =>
  (project.number || String(projects.items.indexOf(project) + 1)).trim().toLowerCase();

/** The screenshot, or the project's number on the surface when there is none. */
function Cover({ project, large = false }: { project: Project; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(project.image) && !failed;

  return (
    <figure className={`project-cover${large ? ' is-large' : ''}`}>
      {hasImage ? (
        <img
          src={assetUrl(project.image)}
          alt={`${project.title} screenshot`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="cover-fallback" aria-hidden="true">
          {project.number || project.title.slice(0, 2)}
        </span>
      )}
      {/* Edit mode only; renders nothing for a visitor. */}
      <ImageDrop bind={edit.project.image(project)} />
    </figure>
  );
}

function Tags({ project }: { project: Project }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {project.tags.map((tag, i) => (
        <Editable
          key={`${tag}-${i}`}
          bind={edit.project.tag(project, i)}
          style={{
            ...dataText,
            padding: '5px 10px',
            border: `1px solid ${color.border}`,
            borderRadius: 999,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The overview. Opens the details view in place rather than linking anywhere.
 * In edit mode a click belongs to the text under it, so there the card opens
 * only from its "View details" line.
 */
function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const editing = useEditMode();

  return (
    <article
      className="project-card"
      data-cursor="link"
      role={editing ? undefined : 'button'}
      tabIndex={editing ? undefined : 0}
      aria-label={editing ? undefined : `${project.title} — details`}
      onClick={editing ? undefined : onOpen}
      onKeyDown={(e) => {
        if (!editing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <Cover project={project} />

      <div className="project-body">
        <Editable bind={edit.project.number(project)} as="span" style={dataText} />
        <Editable
          bind={edit.project.title(project)}
          as="h3"
          className="card-title"
          style={{
            margin: 0,
            fontFamily: font.display,
            fontWeight: 500,
            fontSize: 'clamp(22px, 2vw, 28px)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          }}
        />
        <Editable
          bind={edit.project.summary(project)}
          as="p"
          style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: color.muted }}
        />
        <span
          className="card-cta"
          role={editing ? 'button' : undefined}
          onClick={editing ? onOpen : undefined}
          style={{ marginTop: 'auto', fontFamily: font.body, fontSize: 14, fontWeight: 500 }}
        >
          View details{' '}
          <span className="card-cta-arrow" aria-hidden="true">
            →
          </span>
        </span>
      </div>
    </article>
  );
}

/** Splits the write-up on blank lines; a single newline stays inside its paragraph. */
const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * The details view: a sheet over the page. Portalled to the body so the
 * section's stacking context can't leave the nav sitting on top of it.
 */
function ProjectDetails({ project, onClose }: { project: Project; onClose: () => void }) {
  const editing = useEditMode();
  // Latest handler without re-running the effect, which would unlock and relock.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const body = paragraphs(project.description);

  return createPortal(
    <div className="details-backdrop" onClick={onClose}>
      <div
        className="details-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="details-close"
          onClick={onClose}
          aria-label="Close"
          data-cursor="link"
        >
          ✕
        </button>

        <header style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={dataText}>{project.number}</span>
          <Editable
            bind={edit.project.title(project)}
            as="h2"
            style={{ ...sectionHeading, fontSize: 'clamp(30px, 4vw, 52px)' }}
          />
          <Editable
            bind={edit.project.summary(project)}
            as="p"
            style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: color.muted }}
          />
          <Tags project={project} />

          {(project.link || project.repo) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
              {project.link && (
                <a
                  className="details-btn is-primary"
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="link"
                >
                  {project.linkLabel || 'Visit site'} <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.repo && (
                <a
                  className="details-btn"
                  href={project.repo}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="link"
                >
                  View repo <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}
        </header>

        {(project.image || editing) && <Cover project={project} large />}

        {editing ? (
          <Editable
            bind={edit.project.description(project)}
            as="div"
            className="details-prose"
            style={{ whiteSpace: 'pre-wrap' }}
          />
        ) : (
          body.length > 0 && (
            <div className="details-prose">
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )
        )}

        {project.points.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={monoLabel}>highlights</span>
            <ul className="details-points">
              {project.points.map((_, i) => (
                <Editable key={i} bind={edit.project.point(project, i)} as="li" />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

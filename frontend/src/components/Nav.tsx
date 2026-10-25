import { nav } from '../content';
import { color, font } from '../theme';

/**
 * Floating section nav. Hidden until the hero scrolls away, and the active pill
 * is driven by ScrollTrigger via the `data-active` attribute (see useSiteAnimations).
 *
 * Solid rather than frosted: a blurred glass pill is the stock nav of generated
 * sites, and an opaque one reads the same over every section it passes.
 */
export function Nav() {
  return (
    <nav
      data-nav
      aria-label="Sections"
      style={{
        position: 'fixed',
        top: 22,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        opacity: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '7px 10px',
        border: `1px solid ${color.border}`,
        borderRadius: 999,
        background: color.surface,
      }}
    >
      {nav.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className="nav-link"
          data-cursor="link"
          data-nav-link={item.id}
          // Gap, padding and size live in global.css, which tightens them on phones.
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 999,
            fontFamily: font.body,
          }}
        >
          <span
            className="nav-dot"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: color.accent,
              opacity: 0,
              transition: 'opacity 0.3s',
            }}
          />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

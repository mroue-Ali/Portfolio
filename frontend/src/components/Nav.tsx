import { nav } from '../content';
import { color, font, gradient, rgb } from '../theme';

/**
 * Floating section nav. Hidden until the hero scrolls away, and the active pill
 * is driven by ScrollTrigger via the `data-active` attribute (see useSiteAnimations).
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
        background: `rgba(${rgb(color.surface)},0.72)`,
        backdropFilter: 'blur(14px)',
      }}
    >
      {nav.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className="nav-link"
          data-cursor="link"
          data-nav-link={item.id}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 11px',
            borderRadius: 999,
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          <span
            className="nav-dot"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: gradient.brand,
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

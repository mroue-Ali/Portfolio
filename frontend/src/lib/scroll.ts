import gsap from 'gsap';
import type Lenis from 'lenis';
import { prefersReducedMotion } from './motion';

/**
 * The Lenis instance is created once in App but needed by anything that scrolls
 * the page, so it is registered here rather than threaded through props.
 */
let lenis: Lenis | null = null;

export const registerLenis = (instance: Lenis | null) => {
  lenis = instance;
};

/** Scrolls a section into view and flashes it, so a cited source is visible on arrival. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const y = el.getBoundingClientRect().top + window.scrollY - 40;
  if (lenis) lenis.scrollTo(y, { duration: 1.3 });
  else window.scrollTo({ top: y, behavior: 'smooth' });

  if (prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { boxShadow: '0 0 0 0 rgba(123,104,250,0)' },
    {
      boxShadow: 'inset 0 0 90px 0 rgba(123,104,250,0.16)',
      duration: 0.5,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
      // Land after the scroll settles.
      delay: 0.9,
    },
  );
}

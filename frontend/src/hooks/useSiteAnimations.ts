import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useLayoutEffect } from 'react';
import { nav } from '../content';
import { canHover, prefersReducedMotion } from '../lib/motion';
import { registerLenis } from '../lib/scroll';
import { color } from '../theme';

gsap.registerPlugin(ScrollTrigger);

/** Width below which the project track stacks instead of pinning. */
const PIN_MIN_WIDTH = 900;

/**
 * Owns smooth scrolling and every scroll-driven animation on the page.
 *
 * Runs from App so it mounts after all sections exist, then refreshes
 * ScrollTrigger once every trigger has been measured.
 */
export function useSiteAnimations() {
  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();

    let lenis: Lenis | null = null;
    let onTick: ((time: number) => void) | null = null;

    if (!reduced) {
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
      lenis.on('scroll', ScrollTrigger.update);
      onTick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(onTick);
      gsap.ticker.lagSmoothing(0);
      registerLenis(lenis);
    }

    const ctx = gsap.context(() => {
      // ---------- page load ----------
      if (!reduced) {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('[data-hero-a]', { y: 14, opacity: 0, duration: 0.5 })
          .from('[data-hero-char]', { yPercent: 118, duration: 0.9, stagger: 0.02 }, 0.12)
          .from('[data-hero-b]', { y: 22, opacity: 0, duration: 0.7 }, 0.5)
          .from('[data-hero-c]', { y: 18, opacity: 0, duration: 0.7 }, 0.62)
          .from('[data-hero-d]', { y: 20, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.74);
      }

      // ---------- reading progress ----------
      gsap.to('[data-progress]', {
        width: '100%',
        ease: 'none',
        scrollTrigger: {
          start: 0,
          end: () => document.body.scrollHeight - window.innerHeight,
          scrub: 0.3,
        },
      });

      // ---------- backdrop parallax ----------
      if (!reduced) {
        gsap.to('[data-glow="a"]', {
          yPercent: 26,
          ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: 1.2 },
        });
        gsap.to('[data-glow="b"]', {
          yPercent: -22,
          ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: 1.2 },
        });
      }

      // ---------- nav ----------
      gsap.to('[data-nav]', {
        opacity: 1,
        duration: 0.5,
        scrollTrigger: {
          trigger: '#hero',
          start: 'bottom 70%',
          toggleActions: 'play none none reverse',
        },
      });

      nav.forEach(({ id }) => {
        ScrollTrigger.create({
          trigger: `#${id}`,
          start: 'top 55%',
          end: 'bottom 45%',
          onToggle: (self) => {
            document
              .querySelector(`[data-nav-link="${id}"]`)
              ?.setAttribute('data-active', String(self.isActive));
          },
        });
      });

      // ---------- section reveals ----------
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        const targets = el.children.length ? el.children : [el];
        gsap.from(targets, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        });
      });

      if (!reduced) {
        gsap.to('[data-portrait]', {
          yPercent: -12,
          ease: 'none',
          scrollTrigger: { trigger: '#about', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }

      // ---------- stat counters ----------
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const end = Number(el.getAttribute('data-count'));
        const suffix = el.getAttribute('data-suffix') ?? '';
        const counter = { value: 0 };
        gsap.to(counter, {
          value: end,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = Math.round(counter.value).toLocaleString('en-US') + suffix;
          },
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });

      // ---------- projects ----------
      const track = document.querySelector<HTMLElement>('[data-track]');
      const pinWrap = document.querySelector<HTMLElement>('[data-pin]');
      const canPin = window.innerWidth >= PIN_MIN_WIDTH && !reduced;

      if (track && pinWrap && canPin) {
        // Scroll distance needed to bring the last card fully into view.
        const dist = () =>
          Math.max(0, track.scrollWidth - window.innerWidth + window.innerWidth * 0.12);
        gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: pinWrap,
            start: 'top top',
            end: () => `+=${dist()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            // Pinning inserts a spacer that lengthens the page. This must refresh
            // before the section triggers below it, or they measure against the
            // un-pinned layout and every section after Projects reads as the next one.
            refreshPriority: 1,
          },
        });
      } else if (track) {
        // Stacked layout comes from CSS; just reveal each card on the way past.
        gsap.utils.toArray<HTMLElement>('[data-card]', track).forEach((card) => {
          gsap.from(card, {
            y: 34,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 85%', once: true },
          });
        });
      }

      // ---------- experience timeline ----------
      gsap.to('[data-timeline-fill]', {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-timeline]',
          start: 'top 70%',
          end: 'bottom 60%',
          scrub: 0.5,
        },
      });

      gsap.utils.toArray<HTMLElement>('[data-entry]').forEach((el) => {
        gsap.from(el, {
          x: 40,
          opacity: 0,
          filter: 'blur(6px)',
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        });

        const dot = el.querySelector('[data-dot]');
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          once: true,
          onEnter: () => {
            gsap.set(dot, { backgroundColor: color.violet, borderColor: color.cyan });
            gsap.fromTo(
              dot,
              { scale: 1 },
              { scale: 1.55, duration: 0.32, yoyo: true, repeat: 1, ease: 'power2.inOut' },
            );
          },
        });
      });

      // ---------- magnetic contact button ----------
      const btn = document.querySelector<HTMLElement>('[data-magnetic]');
      if (btn && !reduced && canHover()) {
        const onMove = (e: PointerEvent) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          if (Math.hypot(dx, dy) < r.width / 2 + 60) {
            gsap.to(btn, { x: dx * 0.22, y: Math.max(-8, dy * 0.22), duration: 0.35, ease: 'power2.out' });
          } else {
            gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
          }
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        // gsap.context collects this and runs it on revert.
        return () => window.removeEventListener('pointermove', onMove);
      }
    });

    ScrollTrigger.refresh();

    // The display webfont loads async and changes every heading's height, which
    // moves every trigger below it. Re-measure once it has actually landed.
    let stale = false;
    document.fonts?.ready.then(() => {
      if (!stale) ScrollTrigger.refresh();
    });

    return () => {
      stale = true;
      ctx.revert();
      if (onTick) gsap.ticker.remove(onTick);
      lenis?.destroy();
      registerLenis(null);
    };
  }, []);
}

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { answers, ask as askConfig, profile } from '../content';
import { Editable } from '../live/Editable';
import { edit } from '../live/bindings';
import { useEditMode } from '../live/mode';
import { streamAnswer } from '../lib/ask';
import { prefersReducedMotion } from '../lib/motion';
import { color, font, gradient, rgb, textGradient } from '../theme';

const monoMeta = {
  fontFamily: font.mono,
  fontSize: 11,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: color.muted,
};

/** The headline's type, shared by the animated and the editable version. */
const heroName = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 600,
  fontSize: 'clamp(54px, 10.5vw, 120px)',
  lineHeight: 0.94,
  letterSpacing: '-0.03em',
} as const;

export function Hero() {
  const editing = useEditMode();
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState('');
  const [streamed, setStreamed] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [used, setUsed] = useState(0);

  const heroText = useRef<HTMLDivElement>(null);
  const chipRow = useRef<HTMLDivElement>(null);
  const answerPanel = useRef<HTMLDivElement>(null);
  const inputEl = useRef<HTMLInputElement>(null);
  const borderLight = useRef<HTMLDivElement>(null);
  const rollWrap = useRef<HTMLSpanElement>(null);
  const rollInner = useRef<HTMLSpanElement>(null);

  /** Aborts the in-flight answer when the panel closes or a new one starts. */
  const inFlight = useRef<AbortController | null>(null);
  const openRef = useRef(false);
  const usedRef = useRef(0);

  const close = useCallback(() => {
    inFlight.current?.abort();
    openRef.current = false;

    const panel = answerPanel.current;
    if (panel && !prefersReducedMotion()) {
      gsap.to(panel, { height: 0, opacity: 0, duration: 0.45, ease: 'power2.inOut' });
      gsap.to(heroText.current, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
      gsap.to(chipRow.current, {
        opacity: 1,
        height: 'auto',
        marginTop: 14,
        duration: 0.5,
        ease: 'power2.out',
      });
    } else if (panel) {
      panel.style.height = '0';
      panel.style.opacity = '0';
    }

    setAsked('');
    setStreamed('');
    setStreaming(false);
  }, []);

  const submit = useCallback(
    async (text: string) => {
      if (!text || !text.trim()) {
        inputEl.current?.focus();
        return;
      }
      if (usedRef.current >= askConfig.limit) return;

      inFlight.current?.abort();
      const reduced = prefersReducedMotion();

      openRef.current = true;
      usedRef.current += 1;
      setUsed(usedRef.current);
      setAsked(text);
      setStreamed('');
      setStreaming(true);
      setQuery('');

      // Open the panel and push the hero copy back before the answer arrives.
      const panel = answerPanel.current;
      if (panel && !reduced) {
        gsap.to(heroText.current, { opacity: 0.18, y: -14, duration: 0.6, ease: 'power3.out' });
        gsap.to(chipRow.current, {
          opacity: 0,
          height: 0,
          marginTop: 0,
          duration: 0.4,
          ease: 'power2.out',
        });
        gsap.set(panel, { height: 'auto', opacity: 1 });
        gsap.from(panel, {
          height: 0,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out',
          // The tween ends on the height measured while the panel was empty.
          // Release it so the panel keeps growing as the answer streams in.
          onComplete: () => {
            panel.style.height = 'auto';
          },
        });
      } else if (panel) {
        panel.style.height = 'auto';
        panel.style.opacity = '1';
      }

      const controller = new AbortController();
      inFlight.current = controller;

      // Chunks arrive faster than a frame in bursts, so they are batched into
      // one state update per paint. Appending per chunk would queue dozens of
      // renders for text the eye sees as a single flush.
      let pending = '';
      let frame = 0;
      const flush = () => {
        frame = 0;
        if (!pending) return;
        const next = pending;
        pending = '';
        setStreamed((prev) => prev + next);
      };

      try {
        await streamAnswer(
          text,
          (chunk) => {
            // The panel may have been closed mid-answer.
            if (!openRef.current) return;
            if (reduced) {
              // No typewriter to preserve: paint each chunk as it lands.
              setStreamed((prev) => prev + chunk);
              return;
            }
            pending += chunk;
            if (!frame) frame = requestAnimationFrame(flush);
          },
          controller.signal,
        );
      } finally {
        if (frame) cancelAnimationFrame(frame);
        flush();
        if (inFlight.current === controller) inFlight.current = null;
        if (openRef.current) setStreaming(false);
      }
    },
    [],
  );

  // Escape closes the answer from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openRef.current) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => () => inFlight.current?.abort(), []);

  // Rolling speciality headline: the wrapper resizes to each line as it lands.
  useEffect(() => {
    const inner = rollInner.current;
    const wrap = rollWrap.current;
    if (!inner || !wrap) return;
    const items = inner.querySelectorAll<HTMLElement>('[data-roll]');
    if (!items.length) return;

    const fit = (i: number) => {
      wrap.style.width = `${items[i].getBoundingClientRect().width}px`;
    };
    // Wait for the webfont, otherwise the first measurement is of a fallback face.
    const settle = window.setTimeout(() => fit(0), 260);
    if (prefersReducedMotion()) return () => window.clearTimeout(settle);

    let i = 0;
    const timer = window.setInterval(() => {
      i = (i + 1) % items.length;
      inner.style.transition = 'transform 0.62s cubic-bezier(0.76,0,0.24,1)';
      inner.style.transform = `translateY(-${i * 1.16}em)`;
      fit(i);
    }, 2500);

    return () => {
      window.clearTimeout(settle);
      window.clearInterval(timer);
    };
  }, []);

  const atLimit = used >= askConfig.limit;

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '96px 6vw 64px',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: 1180, margin: '0 auto' }}>
        <div ref={heroText} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            data-hero-a
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: font.mono,
              fontSize: 12,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: color.muted,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color.accentAlt,
                boxShadow: `0 0 10px rgba(${rgb(color.accentAlt)},0.9)`,
              }}
            />
            <Editable bind={edit.profile.availability()} />
          </div>

          {/* Each glyph is masked by its own overflow box so it can slide up on
              load — which also makes the headline impossible to type into. In
              edit mode it collapses to a single editable heading: the intro
              animation has played by then, and a name you can correct is worth
              more than an animation you cannot see twice. */}
          {editing ? (
            <Editable
              bind={edit.profile.name()}
              as="h1"
              style={{ ...heroName, ...textGradient(gradient.headline) }}
            />
          ) : (
            <h1 style={{ ...heroName, display: 'flex', flexWrap: 'wrap' }}>
              {[...profile.name].map((char, i) => (
                <span
                  key={i}
                  style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.06em' }}
                >
                  <span
                    data-hero-char
                    style={
                      char === ' '
                        ? { display: 'inline-block', width: '0.28em' }
                        : { display: 'inline-block', ...textGradient(gradient.headline) }
                    }
                  >
                    {char === ' ' ? ' ' : char}
                  </span>
                </span>
              ))}
            </h1>
          )}

          <div
            data-hero-b
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 12,
              fontFamily: font.display,
              fontWeight: 500,
              fontSize: 'clamp(22px, 3.4vw, 40px)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            <Editable bind={edit.profile.role()} />
            <span style={{ color: color.border }}>/</span>
            <span
              ref={rollWrap}
              style={{
                position: 'relative',
                display: 'inline-block',
                overflow: 'hidden',
                height: '1.16em',
                verticalAlign: 'bottom',
                width: '8em',
                transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <span
                ref={rollInner}
                style={{ position: 'absolute', left: 0, top: 0, display: 'flex', flexDirection: 'column' }}
              >
                {profile.specialities.map((s) => (
                  <span
                    key={s}
                    data-roll
                    style={{
                      height: '1.16em',
                      lineHeight: '1.16em',
                      whiteSpace: 'nowrap',
                      ...textGradient(gradient.brand),
                    }}
                  >
                    {s}
                  </span>
                ))}
              </span>
            </span>
          </div>

          <Editable
            bind={edit.profile.intro()}
            as="p"
            rest={{ 'data-hero-c': true }}
            style={{ margin: 0, maxWidth: 640, fontSize: 17, lineHeight: 1.65, color: color.muted }}
          />
        </div>

        {/* ---------- ask bar ---------- */}
        <div data-hero-d style={{ marginTop: 44, maxWidth: 760, willChange: 'transform' }}>
          <div
            style={{
              position: 'relative',
              padding: 1,
              overflow: 'hidden',
              borderRadius: 4,
              background: color.border,
            }}
          >
            {/* Conic sweep along the border; speeds up while the input has focus. */}
            <div
              ref={borderLight}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '220%',
                aspectRatio: '1',
                margin: '-110% 0 0 -110%',
                background:
                  `conic-gradient(from 0deg, transparent 0deg, transparent 300deg, ${color.accent} 340deg, ${color.accentAlt} 356deg, transparent 360deg)`,
                animation: 'spin360 3s linear infinite',
              }}
            />
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '6px 6px 6px 18px',
                borderRadius: 3,
                background: color.surface,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: font.mono,
                  fontSize: 12,
                  letterSpacing: '0.15em',
                  color: color.accent,
                }}
              >
                &gt;
              </span>
              <input
                ref={inputEl}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit(query);
                  if (e.key === 'Escape') close();
                }}
                onFocus={() => {
                  if (borderLight.current) borderLight.current.style.animationDuration = '1.1s';
                }}
                onBlur={() => {
                  if (borderLight.current) borderLight.current.style.animationDuration = '3s';
                }}
                placeholder={askConfig.placeholder}
                aria-label={askConfig.placeholder}
                disabled={atLimit}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '14px 0',
                  border: 0,
                  background: 'transparent',
                  color: color.text,
                  fontSize: 17,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                className="ask-submit"
                data-cursor="link"
                onClick={() => void submit(query)}
                disabled={atLimit}
                style={{
                  flex: 'none',
                  padding: '12px 20px',
                  borderRadius: 3,
                  background: color.bg,
                  fontFamily: font.mono,
                  fontSize: 11,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: atLimit ? 'not-allowed' : 'pointer',
                }}
              >
                Ask
              </button>
            </div>
          </div>

          <div ref={chipRow} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {askConfig.chipIndices.map((i) => (
              <button
                key={i}
                type="button"
                className="ask-chip"
                data-cursor="link"
                onClick={() => void submit(answers[i].question)}
                style={{
                  padding: '8px 13px',
                  borderRadius: 999,
                  background: 'transparent',
                  fontFamily: font.mono,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                {answers[i].question}
              </button>
            ))}
          </div>

          <div ref={answerPanel} style={{ overflow: 'hidden', height: 0, opacity: 0 }}>
            <div
              style={{
                marginTop: 18,
                padding: '22px 24px',
                border: `1px solid ${color.border}`,
                borderRadius: 4,
                background: `rgba(${rgb(color.surface)},0.86)`,
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: color.muted,
                  }}
                >
                  {asked ? `↳ ${asked}` : ''}
                </div>
                <button
                  type="button"
                  className="ask-close"
                  data-cursor="link"
                  onClick={close}
                  aria-label="Close answer"
                  style={{
                    flex: 'none',
                    width: 26,
                    height: 26,
                    borderRadius: 3,
                    background: 'transparent',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              <p
                aria-live="polite"
                style={{ margin: '14px 0 0', fontSize: 17, lineHeight: 1.65, color: color.text }}
              >
                {streamed}
                {streaming && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      marginLeft: 2,
                      borderBottom: `2px solid ${color.accentAlt}`,
                      animation: 'caretblink 1s step-end infinite',
                    }}
                  />
                )}
              </p>

            </div>
          </div>
        </div>

        <div data-hero-d style={{ marginTop: 26, ...monoMeta, fontSize: 11, letterSpacing: '0.14em' }}>
          {atLimit
            ? `session limit reached — ${askConfig.limit} of ${askConfig.limit} questions`
            : `${askConfig.limit - used} questions left this session`}
        </div>
      </div>
    </section>
  );
}

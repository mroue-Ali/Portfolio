import { gradient } from '../theme';

/** Scroll-linked reading progress; width is scrubbed by ScrollTrigger. */
export function ProgressBar() {
  return (
    <div
      data-progress
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 2,
        width: '0%',
        zIndex: 70,
        background: gradient.brand,
        transformOrigin: 'left center',
      }}
    />
  );
}

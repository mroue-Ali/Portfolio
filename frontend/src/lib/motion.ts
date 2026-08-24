/** Environment probes the animation code branches on. Read at mount, as in the design. */

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** False on touch devices, where pointer-followers and magnetic buttons make no sense. */
export const canHover = () => !window.matchMedia('(hover: none)').matches;

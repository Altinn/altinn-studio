/** Shared vocabulary for the simulations. */

/**
 * Colour role. Every component takes it as a `--<tone>` class suffix, and
 * `sims.css` turns that suffix into a local ink / tint / line set. The inks are
 * mixed against the theme's own text colour, so one tone reads correctly on a
 * dark ground and on a light one.
 */
export type SimTone =
  | 'neutral'
  | 'muted'
  | 'accent' // v9: the engine, the path that holds
  | 'success' // an outcome that landed
  | 'warning' // fragile, waiting, cautionary — not broken
  | 'danger'; // broken, lost, nobody is coming

/** The two columns. */
export type Side = 'v8' | 'v9';

export const SIDE_TITLE: Record<Side, string> = {
  v8: 'I dag (v8)',
  v9: 'Med prosessmotor (v9)',
};

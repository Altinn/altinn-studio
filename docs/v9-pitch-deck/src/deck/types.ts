import type { ComponentType } from 'react';

/** Props every slide component receives from the deck engine. */
export interface SlideProps {
  /**
   * Current build step within the slide.
   *
   * `0` is the slide's base state. A slide that declares `steps: N` gets
   * `N` extra forward advances, so `step` runs `0 … N`.
   */
  step: number;
}

/**
 * The registration contract. This is the ONLY thing `src/slides/index.ts`
 * has to produce — see README.md ("Adding a slide").
 */
export interface SlideDef {
  /** Stable, unique, kebab-case. Used for the overview label and React keys. */
  id: string;
  /** The slide itself. Receives `step`. */
  component: ComponentType<SlideProps>;
  /** Number of forward build steps inside the slide. Omit or `0` for none. */
  steps?: number;
  /** Presenter notes. Not rendered on the stage (yet) — surfaced in the overview. */
  notes?: string;
}

/** Logical canvas the whole deck is authored against. */
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

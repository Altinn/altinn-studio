import { ScenarioStage, ScenarioTeaser } from './parts';
import { FEIL, LUKKER } from './scenarios';
import type { SimProps } from './types';

/** Beats of Kari's first example the opening teaser plays: up to her having to retry. */
export const TEASER_BEATS = 4;

/** Kari's first example, v8 only: the opening of the talk. */
export function SimFeilTeaser({ step }: SimProps) {
  return (
    <ScenarioTeaser
      scenario={FEIL}
      beats={TEASER_BEATS}
      step={step}
      promise="Vi kommer tilbake til Kari."
    />
  );
}

/**
 * Back to Kari's first example: it opens where the teaser left off, and the
 * v9 side catches up line by line.
 */
export function SimFeil({ step }: SimProps) {
  return <ScenarioStage scenario={FEIL} step={step} v8Lead={TEASER_BEATS} />;
}

/** The second example: Kari closes the tab before the submission is done. */
export function SimLukker({ step }: SimProps) {
  return <ScenarioStage scenario={LUKKER} step={step} />;
}

/**
 * The two scenarios.
 *
 * Both are the same component — `parts/ScenarioStage` — with a different
 * script from `scenarios.ts`. A scenario is clicked through: every `→` lands
 * the next line on both sides at once — today (v8) on the left, v9 on the
 * right — and a last press shows both outcomes.
 *
 *   import { SimFeil, SIM_STEPS } from '../sims';
 *   { id: 'scenario-feil', component: FeilSlide, steps: SIM_STEPS.feil }
 */
import { scenarioSteps } from './parts';
import { FEIL, LUKKER } from './scenarios';
import { TEASER_BEATS } from './Sims';

export type { SimProps } from './types';
export { SimFeil, SimFeilTeaser, SimLukker } from './Sims';
export { FEIL, LUKKER } from './scenarios';

/** Build steps each scenario slide declares. */
export const SIM_STEPS = {
  teaser: TEASER_BEATS,
  feil: scenarioSteps(FEIL),
  lukker: scenarioSteps(LUKKER),
} as const;

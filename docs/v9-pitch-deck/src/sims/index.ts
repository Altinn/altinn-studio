/**
 * The two scenarios.
 *
 * Both are the same component — `parts/ScenarioStage` — with a different
 * script from `scenarios.ts`. A scenario is clicked through: every `→` lands
 * one line, first today (v8), then the same accident with v9, then both
 * outcomes side by side.
 *
 *   import { SimFeil, SIM_STEPS } from '../sims';
 *   { id: 'scenario-feil', component: FeilSlide, steps: SIM_STEPS.feil }
 */
import { scenarioSteps } from './parts';
import { FEIL, OMSTART } from './scenarios';

export type { SimProps } from './types';
export { SimFeil, SimOmstart } from './Sims';

/** Build steps each scenario slide declares. */
export const SIM_STEPS = {
  feil: scenarioSteps(FEIL),
  omstart: scenarioSteps(OMSTART),
} as const;

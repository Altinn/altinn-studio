import { ScenarioStage } from './parts';
import { FEIL, OMSTART } from './scenarios';
import type { SimProps } from './types';

/** (1) A service the app depends on does not answer for a moment. */
export function SimFeil({ step }: SimProps) {
  return <ScenarioStage scenario={FEIL} step={step} />;
}

/** (2) A new version rolls out, and the server restarts mid-submit. */
export function SimOmstart({ step }: SimProps) {
  return <ScenarioStage scenario={OMSTART} step={step} />;
}

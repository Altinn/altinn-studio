import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimFeil, FEIL } from '../sims';

/** Scenario 1: a service the app depends on does not answer for a moment. */
export default function ScenarioFeilSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" kicker="Scenario 1" title={FEIL.title} subtitle={FEIL.headline}>
      <SimFeil step={step} />
    </Slide>
  );
}

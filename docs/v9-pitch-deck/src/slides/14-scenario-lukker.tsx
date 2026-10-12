import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimLukker, LUKKER } from '../sims';

/** The second example: Kari closes the tab before the submission is done. */
export default function ScenarioLukkerSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" kicker="Et eksempel til" title={LUKKER.title} subtitle={LUKKER.headline}>
      <SimLukker step={step} />
    </Slide>
  );
}

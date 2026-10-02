import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimOmstart, OMSTART } from '../sims';

/** Scenario 2: a new version rolls out while someone submits. */
export default function ScenarioOmstartSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" kicker="Scenario 2" title={OMSTART.title} subtitle={OMSTART.headline}>
      <SimOmstart step={step} />
    </Slide>
  );
}

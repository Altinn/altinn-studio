import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimOmstart } from '../sims';
import { SimFrame } from './_kit';

/** Scenario 2: a new version rolls out while someone submits. */
export default function ScenarioOmstartSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" className="s-bleed">
      <SimFrame no="Scenario 2" title="Serveren startes på nytt">
        <SimOmstart step={step} />
      </SimFrame>
    </Slide>
  );
}

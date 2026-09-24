import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimFeil } from '../sims';
import { SimFrame } from './_kit';

/** Scenario 1: a service the app depends on does not answer for a moment. */
export default function ScenarioFeilSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" className="s-bleed">
      <SimFrame no="Scenario 1" title="Noe feiler under innsending">
        <SimFeil step={step} />
      </SimFrame>
    </Slide>
  );
}

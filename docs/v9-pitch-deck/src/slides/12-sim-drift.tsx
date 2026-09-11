import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimDrift } from '../sims';
import { SimFrame } from './_kit';

/** Slide 11 — simulation 3: a step fails for real, at three in the morning. */
export default function SimDriftSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" className="s-bleed">
      <SimFrame no="Simulering 3" title="Driftsvakta">
        <SimDrift step={step} />
      </SimFrame>
    </Slide>
  );
}

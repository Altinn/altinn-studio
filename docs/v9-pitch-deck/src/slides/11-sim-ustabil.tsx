import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimMottaker } from '../sims';
import { SimFrame } from './_kit';

/** Slide 10 — simulation 2: the receiving system is down for a while. */
export default function SimUstabilSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" className="s-bleed">
      <SimFrame no="Simulering 2" title="Mottakeren">
        <SimMottaker step={step} />
      </SimFrame>
    </Slide>
  );
}

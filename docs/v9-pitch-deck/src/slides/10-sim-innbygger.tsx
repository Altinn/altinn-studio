import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimInnbygger } from '../sims';
import { SimFrame } from './_kit';

/** Slide 9 — simulation 1: the server restarts while Kari is submitting. */
export default function SimInnbyggerSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" className="s-bleed">
      <SimFrame no="Simulering 1" title="Innbyggeren">
        <SimInnbygger step={step} />
      </SimFrame>
    </Slide>
  );
}

import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { SimFeil, FEIL } from '../sims';

/** Back to Kari: the opening example again, now with the v9 side played out. */
export default function ScenarioFeilSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" kicker="Tilbake til Kari" title={FEIL.title} subtitle={FEIL.headline}>
      <SimFeil step={step} />
    </Slide>
  );
}

import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FEIL, SimFeilTeaser } from '../sims';

/**
 * The hook: the first half of scenario 1, v8 side only, right after the cover.
 * The v9 side stays empty until scenario 1 plays both sides in part 2.
 */
export default function KariSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Et eksempel alle kjenner"
      title={FEIL.title}
      subtitle={FEIL.headline}
    >
      <SimFeilTeaser step={step} />
    </Slide>
  );
}

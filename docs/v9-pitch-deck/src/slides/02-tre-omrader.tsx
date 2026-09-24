import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FeatureGrid, type Feature } from './_kit';

const AREAS: Feature[] = [
  {
    icon: 'server',
    eyebrow: 'Del 1',
    title: 'Infrastruktur',
    body: 'Plattformen appene kjører på: utrulling, Maskinporten, PDF og varsler.',
  },
  {
    icon: 'eye',
    eyebrow: 'Del 2',
    title: 'Frontend',
    body: 'Det brukerne ser og klikker i, og hvordan det kommer ut til dem.',
  },
  {
    icon: 'send',
    eyebrow: 'Del 3',
    title: 'Backend',
    body: 'Det som skjer etter «Send inn», og nye muligheter for utviklere.',
  },
];

/** The map of the talk: three parts, one per click. */
export default function TreOmraderSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="v9 · forhåndsversjon"
      title="Hva blir bedre med v9?"
      subtitle="Vi går gjennom tre områder, fra plattformen og opp til det brukeren ser."
    >
      <div className="s-fill">
        <FeatureGrid features={AREAS} step={step} revealFrom={0} />
      </div>
    </Slide>
  );
}

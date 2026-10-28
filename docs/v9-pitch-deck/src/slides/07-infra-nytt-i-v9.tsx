import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/**
 * The platform part in one slide: what v9 brings. The admin-page status is
 * stated as fact because it is merged before the talk; re-check #20233–#20236.
 */
const FEATURES: Feature[] = [
  {
    icon: 'server',
    eyebrow: 'Prosessmotor',
    title: 'Prosesser som tåler feil',
    body: 'Hvert steg lagres og prøves på nytt når noe feiler. Ingenting blir liggende halvferdig i det stille.',
  },
  {
    icon: 'shield',
    eyebrow: 'Maskinporten',
    title: 'Automatisk integrasjon',
    body: 'Plattformen lager Maskinporten-klienten til appen og tar seg av den. Du slipper å håndtere nøkler.',
  },
  {
    icon: 'eye',
    eyebrow: 'Studio',
    title: 'Status i adminsidene',
    body: 'Se hvilke prosesser som står fast, og start dem igjen rett fra Studio.',
  },
];

/** Infrastructure: what v9 brings to the platform. */
export default function InfraNyttIV9Slide(_: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Bak kulissene"
      title="Nytt med v9"
      subtitle="Plattformen tar mer av jobben, så appen kan gjøre mindre."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} />
      </div>
    </Slide>
  );
}

import type { SlideProps } from '../deck';
import { Slide, Icon } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/**
 * The platform part in one slide: what v9 brings, and a banner for what v8
 * apps already have (CONTENT.md §1.26–28). The admin-page status is stated as
 * fact because it is merged before the talk; re-check #20233–#20236.
 */
const FEATURES: Feature[] = [
  {
    icon: 'server',
    eyebrow: 'Prosessmotor',
    title: 'Prosesser som tåler feil',
    body: 'Hvert steg i prosessen lagres og gjøres ferdig, også når noe feiler underveis.',
  },
  {
    icon: 'shield',
    eyebrow: 'Maskinporten',
    title: 'Satt opp for deg',
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
      kicker="Infrastruktur"
      title="Nytt med v9"
      subtitle="Plattformen tar mer av jobben, så appen kan gjøre mindre."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} />
        <div className="s-banner">
          <span className="s-banner__icon">
            <Icon name="check" size={30} strokeWidth={2.6} />
          </span>
          <p className="s-banner__label">Også i v8</p>
          <p className="s-banner__text">
            Utrulling du kan følge, ny PDF-tjeneste og varsler når noe feiler.
          </p>
        </div>
      </div>
    </Slide>
  );
}

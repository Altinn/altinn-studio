import type { SlideProps } from '../deck';
import { motion } from 'framer-motion';
import { Slide, Icon } from '../components';
import type { IconName } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/**
 * The platform part in one slide: what v9 brings, and a band under it where
 * those jobs move from the app over to the platform. The admin-page status is
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

/** The cards' jobs, as chips that move from the app to the platform. */
const MOVED: { icon: IconName; label: string }[] = [
  { icon: 'server', label: 'Prosessteg' },
  { icon: 'shield', label: 'Maskinporten' },
  { icon: 'eye', label: 'Status' },
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
        <div className="s-split-band">
          <div className="s-split-band__zone s-split-band__zone--app">
            <p className="s-split-band__label">Appen</p>
            <span className="s-split-band__chip">Skjema og regler</span>
          </div>
          <div className="s-split-band__zone s-split-band__zone--platform">
            <p className="s-split-band__label">Plattformen</p>
            {MOVED.map((item, i) => (
              <motion.span
                key={item.label}
                className="s-split-band__chip"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <Icon name={item.icon} size={26} />
                {item.label}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </Slide>
  );
}

import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { ComingStrip, FeatureGrid, type Feature } from './_kit';

/**
 * The platform part in one slide: what v9 adds, what is on its way, and one
 * line for what v8 apps already have (CONTENT.md §1.26–28).
 */
const FEATURES: Feature[] = [
  {
    icon: 'server',
    eyebrow: 'Prosessmotor',
    title: 'Arbeidet blir gjort ferdig',
    body: 'Alt som skjer etter «Send inn», lagres steg for steg og fullføres, også når noe feiler underveis.',
  },
  {
    icon: 'shield',
    eyebrow: 'Maskinporten',
    title: 'Én identitet per app',
    body: 'Appen bruker alltid klienten plattformen har satt opp. Ingen egne klienter å holde styr på.',
  },
  {
    icon: 'refresh',
    eyebrow: 'Omstart',
    title: 'Myke omstarter',
    body: 'Når appen startes på nytt eller skaleres, får det som pågår, bli ferdig først.',
  },
];

/** Infrastructure: what v9 adds, and what is on its way. */
export default function InfraNyttIV9Slide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Infrastruktur"
      title="Nytt med v9"
      subtitle="Plattformen tar mer av jobben, så appen kan gjøre mindre."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} />
        <ComingStrip show={step >= 1}>
          Status fra prosessmotoren i adminsidene i Studio: se hvilke innsendinger som står fast,
          og start dem igjen derfra.
        </ComingStrip>
        <p className="s-footnote">
          Mye har v8-appene også fått: utrulling du kan følge, Maskinporten-nøkler som byttes
          automatisk, ny PDF-tjeneste og varsler når noe feiler.
        </p>
      </div>
    </Slide>
  );
}

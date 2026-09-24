import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { ComingStrip, FeatureGrid, type Feature } from './_kit';

/** Platform improvements that need the app on v9 (CONTENT.md §1, «Infrastructure»). */
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

/** Infrastructure, part 2: what v9 adds, and what is on its way. */
export default function InfraNyttIV9Slide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Infrastruktur"
      title="Nytt med v9"
      subtitle="Noen forbedringer krever at appen er oppgradert."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} />
        <ComingStrip show={step >= 1}>
          Status fra prosessmotoren i adminsidene i Studio: se hvilke innsendinger som står fast,
          og start dem igjen derfra.
        </ComingStrip>
      </div>
    </Slide>
  );
}

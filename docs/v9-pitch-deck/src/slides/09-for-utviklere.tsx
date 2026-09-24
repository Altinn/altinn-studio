import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/**
 * What v9 opens up for app developers (CONTENT.md §1, «For developers»):
 * `IPipelineServiceTask` (durable stages, a completed stage never runs again),
 * mailbox replies (up to 21 days by default), service tasks as their own
 * waiting step, and per-step retry options (`ProcessStepOptions.RetryStrategy`).
 */
const FEATURES: Feature[] = [
  {
    icon: 'layers',
    eyebrow: 'Flere steg',
    title: 'Tjenesteoppgaver i flere steg',
    body: 'Del opp en oppgave i steg. Hvert steg lagres når det er ferdig, og kjøres ikke på nytt.',
  },
  {
    icon: 'clock',
    eyebrow: 'Venting',
    title: 'Vent på svar utenfra',
    body: 'La en oppgave vente i timer eller dager på svar fra et annet system, uten egne køer.',
  },
  {
    icon: 'user',
    eyebrow: 'Ventesteg',
    title: 'Oppgaven venter selv',
    body: 'Brukeren ser en venteside, eller appens egen side, til oppgaven er ferdig. Du trenger ikke lenger et eget «feedback»-steg.',
  },
  {
    icon: 'refresh',
    eyebrow: 'Nye forsøk',
    title: 'Egne regler for nye forsøk',
    body: 'Bestem for hvert steg hvor ofte og hvor lenge plattformen skal prøve igjen.',
  },
];

/** Backend, for developers: what service tasks can do now. */
export default function ForUtviklereSlide(_: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Backend"
      title="Nye muligheter for utviklere"
      subtitle="Tjenesteoppgaver kan gjøre mer og tåle mer."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} />
      </div>
    </Slide>
  );
}

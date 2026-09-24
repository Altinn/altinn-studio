import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/**
 * Platform-side improvements that reach v8 apps too (CONTENT.md §1, «Infrastructure»).
 * The Maskinporten client managed by the platform needs 8.3.0 or newer.
 */
const FEATURES: Feature[] = [
  {
    icon: 'rocket',
    eyebrow: 'Utrulling',
    title: 'Utrulling du kan følge',
    body: 'En utrulling fra Studio følges helt til den er ferdig, og hvert miljø kjører versjonen du valgte.',
  },
  {
    icon: 'lock',
    eyebrow: 'Maskinporten',
    title: 'Ingen nøkler å lime inn',
    body: 'Du velger tilganger i Studio. Plattformen lager klienten og bytter nøklene for deg.',
  },
  {
    icon: 'document',
    eyebrow: 'PDF',
    title: 'Ny PDF-tjeneste',
    body: 'Alle PDF-er lages nå av en ny tjeneste, bygget for stabilitet og høy last.',
  },
  {
    icon: 'bell',
    eyebrow: 'Varsler',
    title: 'Beskjed når noe feiler',
    body: 'Tjenesteeiere kan få varsel på e-post, SMS eller Slack når noe feiler i appene deres.',
  },
];

/** Infrastructure, part 1: what every app already has. */
export default function InfraForAlleSlide(_: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Infrastruktur"
      title="Allerede bedre — også for v8-apper"
      subtitle="Plattformen er blitt bedre siden forrige versjon. Dette får alle apper, uten å oppgradere."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} tone="ok" />
      </div>
    </Slide>
  );
}

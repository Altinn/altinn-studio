import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/** User-visible frontend changes in v9. */
const FEATURES: Feature[] = [
  {
    icon: 'clock',
    eyebrow: 'Innsending',
    title: 'Tydelig venting',
    body: 'Én lasteside. Etter åtte sekunder står det at siden trygt kan lukkes.',
  },
  {
    icon: 'refresh',
    eyebrow: 'Omlasting',
    title: 'Status som varer',
    body: 'Last siden på nytt midt i en innsending, og samme status vises.',
  },
  {
    icon: 'shield',
    eyebrow: 'Svar',
    title: 'Ingen tapte svar',
    body: 'Nettleseren sier fra før svar som ikke er lagret, går tapt.',
  },
  {
    icon: 'check',
    eyebrow: 'Feil i skjemaet',
    title: 'Feil til rett tid',
    body: 'Feillisten kommer når brukeren prøver å gå videre, og får fokus.',
  },
];

/** Frontend: what the people filling in the form notice. */
export default function FrontendBrukerneMerkerSlide(_: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Det brukerne merker"
      title="Brukeropplevelsen"
      subtitle="Tryggere å fylle ut, og tydeligere når skjemaet sendes inn."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} />
      </div>
    </Slide>
  );
}

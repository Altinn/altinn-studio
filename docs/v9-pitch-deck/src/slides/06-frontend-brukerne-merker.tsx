import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/** User-visible frontend changes in v9 (CONTENT.md §1, «Frontend»). */
const FEATURES: Feature[] = [
  {
    icon: 'clock',
    eyebrow: 'Innsending',
    title: 'Tydelig venting',
    body: 'Én lasteside i stedet for flere ulike lasteikoner. Etter åtte sekunder står det at det er trygt å lukke siden.',
  },
  {
    icon: 'refresh',
    eyebrow: 'Omlasting',
    title: 'Status som varer',
    body: 'Laster brukeren siden på nytt midt i en innsending, vises samme status som før.',
  },
  {
    icon: 'shield',
    eyebrow: 'Svar',
    title: 'Ingen tapte svar',
    body: 'Nettleseren sier fra hvis brukeren lukker siden før svarene er lagret.',
  },
  {
    icon: 'check',
    eyebrow: 'Feil i skjemaet',
    title: 'Feil til rett tid',
    body: 'Feillisten dukker opp først når brukeren prøver å gå videre, og får fokus. Det hjelper dem som bruker skjermleser.',
  },
];

/** Frontend: what the people filling in the form notice. */
export default function FrontendBrukerneMerkerSlide(_: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Frontend"
      title="Brukeropplevelsen"
      subtitle="Tryggere å fylle ut, og tydeligere når skjemaet sendes inn."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} />
      </div>
    </Slide>
  );
}

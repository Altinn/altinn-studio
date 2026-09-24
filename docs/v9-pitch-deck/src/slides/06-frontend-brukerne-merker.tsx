import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/** User-visible frontend changes in v9 (CONTENT.md §1, «Frontend»). */
const FEATURES: Feature[] = [
  {
    icon: 'clock',
    eyebrow: 'Innsending',
    title: 'Tydelig venting',
    body: 'Én lasteskjerm i stedet for skiftende spinnere. Etter åtte sekunder står det at det er trygt å lukke siden.',
  },
  {
    icon: 'refresh',
    eyebrow: 'Omlasting',
    title: 'Status som varer',
    body: 'Lastes siden på nytt midt i en innsending, står statusen der den stod.',
  },
  {
    icon: 'shield',
    eyebrow: 'Svar',
    title: 'Ingen tapte svar',
    body: 'Nettleseren advarer før siden lukkes med svar som ikke er lagret.',
  },
  {
    icon: 'check',
    eyebrow: 'Feil i skjemaet',
    title: 'Feil når det passer',
    body: 'Feillisten vises først når brukeren prøver å gå videre, og får fokus — bedre med skjermleser.',
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

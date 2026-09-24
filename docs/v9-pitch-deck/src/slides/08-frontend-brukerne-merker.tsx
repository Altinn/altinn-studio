import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { FeatureGrid, type Feature } from './_kit';

/** User-visible frontend changes in v9 (CONTENT.md §1, «Frontend»). */
const FEATURES: Feature[] = [
  {
    icon: 'clock',
    eyebrow: 'Innsending',
    title: 'Rolig venting',
    body: 'Én lasteskjerm i stedet for skiftende spinnere. Etter åtte sekunder står det at det er trygt å lukke siden.',
  },
  {
    icon: 'refresh',
    eyebrow: 'Omlasting',
    title: 'Samme status etterpå',
    body: 'Lastes siden på nytt midt i en innsending, vises samme status som før.',
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
    title: 'Roligere feilliste',
    body: 'Feillisten vises først når brukeren prøver å gå videre, og får fokus — bedre med skjermleser.',
  },
];

/** Frontend, part 2: what the people filling in the form notice. */
export default function FrontendBrukerneMerkerSlide(_: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Frontend"
      title="Det brukerne merker"
      subtitle="Små endringer som gjør skjemaene tryggere å fylle ut og sende inn."
    >
      <div className="s-fill">
        <FeatureGrid features={FEATURES} />
      </div>
    </Slide>
  );
}

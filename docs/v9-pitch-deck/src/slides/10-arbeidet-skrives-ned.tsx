import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import type { IconName } from '../components';
import { StepRow } from './_kit';

const PROMISES: { icon: IconName; text: string }[] = [
  { icon: 'refresh', text: 'Feiler noe, prøves det igjen automatisk.' },
  { icon: 'check', text: 'Det som er fullført, kjøres ikke på nytt.' },
  { icon: 'eye', text: 'Alt kan ses, og startes igjen.' },
];

/**
 * Backend, the promise in one sentence. Guardrail: «kjøres ikke på nytt» is
 * about a *completed* step — never «nøyaktig én gang» (CONTENT.md, «Do NOT claim»).
 */
export default function ArbeidetSkrivesNedSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="split"
      splitRatio="720px 888px"
      kicker="Backend"
      title="Arbeidet skrives ned før det gjøres"
      subtitle="I v9 lagrer plattformen hvert steg etter «Send inn», og følger det opp til det er ferdig."
    >
      <div className="s-db" style={{ position: 'static', width: '100%' }}>
        <p className="s-db__head">
          <Icon name="send" size={24} />
          Karis innsending
        </p>
        <StepRow label="1 · Avslutt steget" state="Fullført" tone="ok" />
        <StepRow label="2 · Lag PDF" state="Fullført" tone="ok" />
        <StepRow label="3 · Send til mottaker" state="Prøver igjen" tone="wait" />
        <StepRow label="4 · Varsle andre systemer" state="I kø" tone="idle" />
      </div>

      <div className="s-fill" style={{ justifyContent: 'center', gap: 'var(--sp-4)' }}>
        {PROMISES.map((p, i) => (
          <Reveal key={p.text} show={step >= i + 1}>
            <p className="s-bullet">
              <Icon name={p.icon} size={30} />
              {p.text}
            </p>
          </Reveal>
        ))}
      </div>
    </Slide>
  );
}

import { Fragment } from 'react';
import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import type { IconName } from '../components';
import { Backdrop, BrandMark } from './_kit';

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'terminal',
    title: 'Kjør upgrade',
    body: '«studioctl app upgrade v9» skriver om det den kan, og skriver TODO for resten.',
  },
  {
    icon: 'server',
    title: 'Test i testmiljø',
    body: 'Motoren kjører i testmiljøene. Vi hjelper til med oppsettet.',
  },
  {
    icon: 'bell',
    title: 'Si fra hva som skurrer',
    body: 'Vi vil helst ha apper med ekte tjenesteoppgaver: PDF, forsendelse, arkiv.',
  },
];

/** Slide 15 — the ask. */
export default function BliMedSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="9.0.0-preview.5"
      title="Bli med i pilotene"
      subtitle="v9 er i preview og motoren kjører i testmiljøene. Vi ser etter apper som vil prøve den med oss."
    >
      <Backdrop variant="closing" />
      <BrandMark place="bottom" />

      <div className="s-fill">
        <div className="s-steps">
          {STEPS.map((item, i) => (
            <Fragment key={item.title}>
              {i > 0 && (
                <Reveal show={step >= i} className="s-step__arrow">
                  →
                </Reveal>
              )}
              <Reveal show={step >= i} className="s-stepwrap">
                <div className="s-step">
                  <span className="s-step__no">
                    <Icon name={item.icon} size={30} />
                  </span>
                  <p className="s-step__title">{item.title}</p>
                  <p className="s-step__body">{item.body}</p>
                </div>
              </Reveal>
            </Fragment>
          ))}
        </div>

        <Reveal show={step >= 3}>
          <p className="s-cta">
            <Icon name="flag" size={34} />
            Ta kontakt, så hjelper vi med oppgraderingen.
          </p>
        </Reveal>
      </div>
    </Slide>
  );
}

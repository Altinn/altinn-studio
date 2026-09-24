import { Fragment } from 'react';
import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import type { IconName } from '../components';
import { Backdrop, BrandMark } from './_kit';

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'flag',
    title: 'Si fra',
    body: 'Fortell oss hvilken app du vil prøve v9 med.',
  },
  {
    icon: 'terminal',
    title: 'Oppgrader',
    body: 'Verktøyet gjør det meste, og vi hjelper med resten.',
  },
  {
    icon: 'server',
    title: 'Test sammen med oss',
    body: 'Vi åpner testmiljøet for deg og følger opp underveis.',
  },
];

/** The ask. */
export default function BliMedSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="v9 · lukket beta"
      title="Bli med i pilotene"
      subtitle="v9 er i lukket beta, foreløpig internt. Vi åpner for flere organisasjoner etter hvert som dere melder dere."
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

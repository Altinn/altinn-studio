import { Fragment } from 'react';
import type { SlideProps } from '../deck';
import { Slide, Icon } from '../components';
import type { IconName } from '../components';
import { Backdrop, BrandMark, Enter } from './_kit';

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'terminal',
    title: 'Oppgrader',
    body: 'Kjør oppgraderingen rett fra Studio, eller med studioctl.',
  },
  {
    icon: 'server',
    title: 'Test som vanlig',
    body: 'Rull ut til testmiljøet og prøv appen slik dere alltid gjør.',
  },
  {
    icon: 'bell',
    title: 'Si fra',
    body: 'Fortell oss hva som fungerer, og hva som skurrer.',
  },
];

/** The call to action: open beta, self-serve upgrade from Studio or studioctl. */
export default function BliMedSlide(_: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="v9 · åpen beta"
      title="Kom i gang med v9"
      subtitle="v9 er i åpen beta. Alle kan oppgradere selv — og vi hjelper gjerne."
    >
      <Backdrop variant="closing" />
      <BrandMark place="bottom" />

      <div className="s-fill">
        <div className="s-steps">
          {STEPS.map((item, i) => (
            <Fragment key={item.title}>
              {i > 0 && (
                <Enter index={i * 2 - 1} className="s-step__arrow">
                  →
                </Enter>
              )}
              <Enter index={i * 2} className="s-stepwrap">
                <div className="s-step">
                  <span className="s-step__no">
                    <Icon name={item.icon} size={30} />
                  </span>
                  <p className="s-step__title">{item.title}</p>
                  <p className="s-step__body">{item.body}</p>
                </div>
              </Enter>
            </Fragment>
          ))}
        </div>

        <Enter index={STEPS.length * 2 - 1}>
          <p className="s-cta">
            <Icon name="flag" size={34} />
            Trenger dere hjelp? Ta kontakt.
          </p>
        </Enter>
      </div>
    </Slide>
  );
}

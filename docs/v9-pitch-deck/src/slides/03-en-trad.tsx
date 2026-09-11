import type { SlideProps } from '../deck';
import { Slide, Reveal } from '../components';
import { Chain } from './_kit';

/** Slide 3 — nothing is written down while the chain runs. */
export default function EnTradSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="I dag · v8"
      title="Alt henger i én tråd"
      subtitle="Ingenting er skrevet ned underveis. Faller app-en, finnes det ikke noe notat om hva som var i gang."
    >
      <div className="s-fill">
        <div className="s-dim">
          <Chain />
        </div>

        <Reveal show={step >= 1}>
          <p className="s-underline">
            <span className="s-underline__rule" />
            Ingen varige spor
            <span className="s-underline__rule" />
          </p>
        </Reveal>

        <Reveal show={step >= 2}>
          <div className="s-row" style={{ gap: 64, alignItems: 'center' }}>
            <div className="s-note">
              <p className="s-note__label">Notat om det som var i gang</p>
              <div className="s-note__lines" />
            </div>
            <p className="s-lead" style={{ flex: '1 1 auto' }}>
              Arbeidet finnes bare i minnet til én prosess, i den tiden nettleseren holder
              forbindelsen åpen.
            </p>
          </div>
        </Reveal>
      </div>
    </Slide>
  );
}

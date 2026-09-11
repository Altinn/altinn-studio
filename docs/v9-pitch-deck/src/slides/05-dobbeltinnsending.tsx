import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import { ArrowDefs, Wire } from './_kit';

/** Slide 5 — two clicks, one instance, two of everything. */
export default function DobbeltinnsendingSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="I dag · v8"
      title="Dobbeltinnsending"
      subtitle="To faner, eller ett nytt forsøk etter at forbindelsen røk. Fram til v8.11 kunne begge kjøre — to PDF-er, to forsendelser."
    >
      <div className="s-fill">
        <div className="s-diagram">
          {/*
            The diagram spans the full body width (1668 = 1920 - 2 x 126), so its
            left edge sits on the template's one left margin, in line with the
            caveat card below it. Box positions and wire endpoints are in the same
            coordinate space as the SVG viewBox.
          */}
          <svg
            className="s-diagram__svg"
            viewBox="0 0 1668 420"
            width={1668}
            height={420}
            aria-hidden
          >
            <ArrowDefs />
            <Wire d="M360 80 C 500 80, 528 190, 659 190" tone="blue" />
            <Wire d="M360 340 C 500 340, 528 230, 659 230" tone="amber" show={step >= 1} />
            <Wire d="M1004 190 C 1140 190, 1168 80, 1263 80" tone="red" show={step >= 2} />
            <Wire
              d="M1004 230 C 1140 230, 1168 340, 1263 340"
              tone="red"
              show={step >= 2}
              delay={0.1}
            />
          </svg>

          <div className="s-box s-box--click" style={{ left: 0, top: 20, width: 360, height: 120 }}>
            <span className="s-box__title">Klikk 1</span>
            <span className="s-box__sub">Fane A</span>
          </div>

          <Reveal show={step >= 1} keepSpace={false}>
            <div
              className="s-box s-box--click"
              style={{ left: 0, top: 280, width: 360, height: 120 }}
            >
              <span className="s-box__title">Klikk 2</span>
              <span className="s-box__sub">Ny fane, eller nytt forsøk</span>
            </div>
          </Reveal>

          <div
            className="s-box s-box--center"
            style={{ left: 664, top: 135, width: 340, height: 150 }}
          >
            <span className="s-box__title">Samme instans</span>
            {/* Explicit break: left to wrap, the box orphans the last word. */}
            <span className="s-box__sub">
              Samme oppgave,
              <br />
              samme versjon
            </span>
          </div>

          <Reveal show={step >= 2} keepSpace={false}>
            <div
              className="s-box s-box--out"
              style={{ left: 1268, top: 20, width: 400, height: 120 }}
            >
              <span className="s-box__title">
                PDF <span className="s-x2">×2</span>
              </span>
              <span className="s-box__sub">To like dokumenter</span>
            </div>
          </Reveal>

          <Reveal show={step >= 2} keepSpace={false}>
            <div
              className="s-box s-box--out"
              style={{ left: 1268, top: 280, width: 400, height: 120 }}
            >
              <span className="s-box__title">
                Forsendelse <span className="s-x2">×2</span>
              </span>
              <span className="s-box__sub">To leveranser ut</span>
            </div>
          </Reveal>
        </div>

        <Reveal show={step >= 3}>
          <div className="s-outcome s-outcome--warn">
            <span className="s-outcome__icon">
              <Icon name="lock" size={30} />
            </span>
            <span>
              Fra v8.11: en lås mot Storage stopper samtidige klikk
              <span className="s-outcome__sub">
                Men låsen er en leie på fem minutter — ingen nøkkel kjenner igjen «samme forsøk én
                gang til»
              </span>
            </span>
          </div>
        </Reveal>
      </div>
    </Slide>
  );
}

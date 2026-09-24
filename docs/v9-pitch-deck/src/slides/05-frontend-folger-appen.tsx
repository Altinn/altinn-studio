import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';

/**
 * The frontend part's lead slide, as two pictures (CONTENT.md §1.29–31).
 *
 * Left: the one speed measurement there is — page navigation in a 32-page
 * form went from ~280–310 ms to ~150–180 ms (#18987); the bars use the
 * midpoints, rounded. Right: v9 ships the frontend inside the app's package (#18947),
 * so the frontend always has the app's version. «Backend» covers both the
 * app libraries and the app's own logic. The v8 contrast (it loads the
 * newest frontend from a CDN) is in the speaker notes, not on the slide.
 */
const BARS = [
  { label: 'v8', ms: 300, tone: 'old' },
  { label: 'v9', ms: 165, tone: 'new' },
] as const;
const MAX_MS = 300;
const EASE = [0.22, 1, 0.36, 1] as const;

export default function FrontendFolgerAppenSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Frontend"
      title="Raskere, og i takt med appen"
      subtitle="Ny arkitektur under panseret, og frontend som alltid har samme versjon som appen."
    >
      <div className="s-fe">
        <section className="s-fe__panel">
          <p className="s-fe__eyebrow">
            <Icon name="bolt" size={28} />
            Raskere
          </p>
          <p className="s-fe__lead">Sidebytte i et skjema med 32 sider</p>

          <div className="s-fe__bars">
            {BARS.map((bar, i) => (
              <div key={bar.label} className={`s-fe__bar s-fe__bar--${bar.tone}`}>
                <span className="s-fe__bar-label">{bar.label}</span>
                <span className="s-fe__bar-track">
                  <motion.span
                    className="s-fe__bar-fill"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(bar.ms / MAX_MS) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.15 + i * 0.25, ease: EASE }}
                  />
                </span>
                <span className="s-fe__bar-value">ca. {bar.ms} ms</span>
              </div>
            ))}
          </div>
          <p className="s-fe__result">Nesten halvparten av ventetiden er borte.</p>

          <p className="s-fe__body">
            Hver side henter bare det den trenger, og husker det til neste gang.
          </p>
        </section>

        <Reveal show={step >= 1} from="right">
          <section className="s-fe__panel">
            <p className="s-fe__eyebrow">
              <Icon name="layers" size={28} />I takt med appen
            </p>
            <p className="s-fe__lead">Frontend ligger i samme pakke som appen</p>

            <div className="s-fe__equation">
              <span className="s-fe__app">Din app</span>
              <span className="s-fe__op" aria-hidden>
                =
              </span>
              <div className="s-fe__group">
                <span className="s-fe__paren" aria-hidden>
                  (
                </span>
                <span className="s-fe__item">
                  <Icon name="server" size={26} />
                  Backend
                </span>
                <span className="s-fe__op" aria-hidden>
                  +
                </span>
                <span className="s-fe__item">
                  <Icon name="eye" size={26} />
                  Frontend
                </span>
                <span className="s-fe__paren" aria-hidden>
                  )
                </span>
              </div>
              <span className="s-fe__version">
                <Icon name="check" size={22} strokeWidth={2.8} />
                Samme versjon
              </span>
            </div>

            <p className="s-fe__body">Det du tester, er det brukerne får.</p>
          </section>
        </Reveal>
      </div>
    </Slide>
  );
}

import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal, StatBig } from '../components';

/**
 * v9 ships the frontend inside the app's package (#18947). The speed figure is
 * the one measurement there is: page navigation in a 32-page test app, from
 * ~280–310 ms to ~150–180 ms on simple pages (#18987). Say «tidlig måling».
 */
export default function FrontendFolgerAppenSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="split"
      splitRatio="1000px 608px"
      kicker="Frontend"
      title="Frontend følger appen"
      subtitle="I v9 leveres frontend i samme pakke som appen. Versjonen du tester, er versjonen brukerne får."
    >
      <div className="s-stack">
        <div className="s-outcome s-outcome--warn">
          <span className="s-outcome__icon">
            <Icon name="refresh" size={30} />
          </span>
          <span>
            I v8 henter appen alltid nyeste frontend
            <span className="s-outcome__sub">Nye versjoner når brukerne uten at du har testet dem</span>
          </span>
        </div>
        <div className="s-outcome s-outcome--ok">
          <span className="s-outcome__icon">
            <Icon name="check" size={30} />
          </span>
          <span>
            I v9 ligger frontend i appen
            <span className="s-outcome__sub">Du bestemmer selv når du oppgraderer</span>
          </span>
        </div>
      </div>

      <Reveal show={step >= 1} from="right">
        <StatBig
          value="40–50"
          suffix="%"
          label="raskere sidebytte i store skjema"
          caption="Tidlig måling i en testapp med 32 sider"
        />
      </Reveal>
    </Slide>
  );
}

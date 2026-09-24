import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal, StatBig } from '../components';
import type { IconName } from '../components';

/**
 * The frontend part's lead slide (CONTENT.md §1.29–31). The architecture row
 * is the routing rewrite (per-page loaders with cached data), settings and texts
 * embedded in the first page load, and less re-rendering. The speed figure is
 * the one measurement there is — page navigation in a 32-page form, #18987;
 * the notes say it is one measurement.
 */
const ROWS: { tone: 'ok' | 'warn'; icon: IconName; title: string; sub: string }[] = [
  {
    tone: 'ok',
    icon: 'layers',
    title: 'Ny arkitektur under panseret',
    sub: 'Hver side henter kun det den trenger, og husker det',
  },
  {
    tone: 'warn',
    icon: 'refresh',
    title: 'I v8 henter appen alltid nyeste frontend',
    sub: 'Nye versjoner når brukerne uten at du har testet dem',
  },
  {
    tone: 'ok',
    icon: 'check',
    title: 'I v9 ligger frontend i appen',
    sub: 'Versjonen du tester, er versjonen brukerne får',
  },
];

export default function FrontendFolgerAppenSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="split"
      splitRatio="1040px 568px"
      kicker="Frontend"
      title="Raskere, og levert med appen"
      subtitle="Frontend har fått ny arkitektur, og i v9 kommer den i samme pakke som appen."
    >
      <div className="s-stack">
        {ROWS.map((row) => (
          <div key={row.title} className={`s-outcome s-outcome--${row.tone}`}>
            <span className="s-outcome__icon">
              <Icon name={row.icon} size={30} />
            </span>
            <span>
              {row.title}
              <span className="s-outcome__sub">{row.sub}</span>
            </span>
          </div>
        ))}
      </div>

      <Reveal show={step >= 1} from="right">
        <StatBig
          value="40–50"
          suffix="%"
          label="raskere sidebytte"
          caption="Målt i et skjema med 32 sider"
        />
      </Reveal>
    </Slide>
  );
}

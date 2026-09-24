import type { SlideProps } from '../deck';
import { Slide, Reveal } from '../components';
import { Dot } from './_kit';

type Seg = 'ok' | 'run' | 'wait' | 'bad' | 'idle';

const CHAINS: {
  id: string;
  segs: Seg[];
  time: string;
  state: string;
  tone: 'ok' | 'run' | 'wait' | 'bad';
  selected?: boolean;
}[] = [
  {
    id: 'skjema-a · 4f2a…',
    segs: ['ok', 'ok', 'ok', 'run', 'idle', 'idle'],
    time: '12,4 s',
    state: 'Kjører',
    tone: 'run',
  },
  {
    id: 'skjema-a · 9c17…',
    segs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    time: '8,1 s',
    state: 'Fullført',
    tone: 'ok',
  },
  {
    id: 'skjema-b · 22be…',
    segs: ['ok', 'ok', 'wait', 'idle', 'idle', 'idle'],
    time: '2 min',
    state: 'Venter',
    tone: 'wait',
  },
  {
    id: 'skjema-b · 7d31…',
    segs: ['ok', 'ok', 'bad', 'idle', 'idle', 'idle'],
    time: '41 s',
    state: 'Nytt forsøk',
    tone: 'bad',
    selected: true,
  },
  {
    id: 'skjema-c · b08c…',
    segs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    time: '6,7 s',
    state: 'Fullført',
    tone: 'ok',
  },
];

const ERRORS: { time: string; text: string; badge: string }[] = [
  { time: '11:05:09', text: '503 fra mottaker', badge: 'Kan prøves igjen' },
  { time: '11:04:41', text: 'Tidsavbrudd', badge: 'Kan prøves igjen' },
  { time: '11:04:12', text: '503 fra mottaker', badge: 'Kan prøves igjen' },
];

const LEGEND: { tone: 'ok' | 'run' | 'wait' | 'bad'; label: string }[] = [
  { tone: 'ok', label: 'Fullført' },
  { tone: 'run', label: 'Kjører' },
  { tone: 'wait', label: 'Venter' },
  { tone: 'bad', label: 'Nytt forsøk' },
];

/** Slide 13 — the engine dashboard: every step, every attempt, every error. */
export default function DashbordSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Med prosessmotor · v9"
      title="Vi kan se hva som skjer"
      subtitle="Hver instans, hvert steg, hvert forsøk og hver feilmelding — med tidsbruk og full feilhistorikk."
    >
      <div className="s-dash">
        <div className="s-panel">
          <div className="s-panel__head">
            <span>Aktive kjeder</span>
            <span className="s-live">
              <Dot tone="ok" />
              Sanntid
            </span>
          </div>

          {CHAINS.map((chain) => (
            <div
              key={chain.id}
              className={`s-chainrow${chain.selected && step >= 1 ? ' s-chainrow--sel' : ''}`}
            >
              <span className="s-chainrow__id">{chain.id}</span>
              <span className="s-pipe">
                {chain.segs.map((seg, i) => (
                  <span
                    key={i}
                    className={`s-pipe__seg${seg === 'idle' ? '' : ` s-pipe__seg--${seg}`}`}
                  />
                ))}
              </span>
              <span className="s-chainrow__time">{chain.time}</span>
              <span className={`s-chainrow__state is-${chain.tone}`}>
                <Dot tone={chain.tone} />
                {chain.state}
              </span>
            </div>
          ))}

          <p className="s-legend">
            {LEGEND.map((item) => (
              <span key={item.label}>
                <Dot tone={item.tone} />
                {item.label}
              </span>
            ))}
          </p>
        </div>

        <Reveal show={step >= 1} from="right">
          <div className="s-panel">
            <div className="s-panel__head">
              <span>Steg 3 · Forsendelse</span>
              <span className="s-tag s-tag--bad">Nytt forsøk</span>
            </div>

            <div className="s-drawer">
              <p className="s-drawer__title">Feilhistorikk</p>
              <div className="s-drawer__meta">
                <span className="s-tag">Startet 11:04:03</span>
                <span className="s-tag">±20 % spredning</span>
                <span className="s-tag s-tag--ok">Neste om 42 s</span>
              </div>

              {ERRORS.map((entry, i) => (
                <Reveal key={entry.time} show={step >= 2} delay={i * 0.07}>
                  <div className="s-err">
                    <span className="s-err__time">{entry.time}</span>
                    <span className="s-err__body">{entry.text}</span>
                    <span className="s-err__badge is-wait">{entry.badge}</span>
                  </div>
                </Reveal>
              ))}

              <Reveal show={step >= 3} className="s-opswrap">
                <div className="s-opsbar">
                  <span className="s-opbtn s-opbtn--primary">Kjør på nytt</span>
                  <span className="s-opbtn">Sjekk nå</span>
                  <span className="s-opbtn">Gi opp</span>
                </div>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </Slide>
  );
}

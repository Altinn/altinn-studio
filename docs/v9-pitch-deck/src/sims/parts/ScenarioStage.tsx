import { motion } from 'framer-motion';
import { Icon, type IconName } from '../../components';
import { phaseAt, screenAt, type Beat, type RowStatus, type Scenario, type Screen, type ScreenTone } from './scenario';
import { SIDE_TITLE, type Side, type SimTone } from './types';

/**
 * THE ONE SCENARIO TEMPLATE.
 *
 * The same accident, told twice on one full-width stage: first today (v8),
 * then with the process engine (v9), then both outcomes side by side. Every
 * press of `→` lands one line, so the room reads one thing at a time.
 *
 *   ┌ one icon + one sentence: what goes wrong ────── [ I dag (v8) ] ┐
 *   │  the phone Kari is holding  │  the list of what happens, line  │
 *   │                             │  by line                         │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * There are no servers-in-boxes, queues or status codes in here. The scenes are
 * about the person pressing the button.
 */

const SCREEN_TONE: Record<ScreenTone, SimTone> = {
  idle: 'muted',
  busy: 'accent',
  wait: 'warning',
  ok: 'success',
  bad: 'danger',
};

/** `null` means the row draws a spinner (or a dot, once it is history). */
const STATUS_ICON: Record<RowStatus, IconName | null> = {
  running: null,
  ok: 'check',
  fail: 'x',
  wait: 'clock',
};

/** v8 spends the cautionary gold and red; v9 stays blue and green. */
function rowTone(beat: Beat, side: Side): SimTone {
  if (beat.tone) return beat.tone;
  if (beat.status === 'fail') return 'danger';
  if (side === 'v8') return beat.status === 'ok' ? 'neutral' : 'warning';
  return beat.status === 'ok' ? 'success' : 'accent';
}

const EASE = [0.22, 1, 0.36, 1] as const;

function ScreenGlyph({ tone }: { tone: ScreenTone }) {
  if (tone === 'busy') return <span className="scr__spinner" aria-hidden />;
  const icon = tone === 'ok' ? 'check' : tone === 'bad' ? 'x' : tone === 'wait' ? 'clock' : null;
  if (!icon) return <span className="scr__dot" aria-hidden />;
  return <Icon name={icon} size={34} strokeWidth={2.6} />;
}

function Phone({ frame, screen }: { frame: string; screen: Screen }) {
  const tone = SCREEN_TONE[screen.tone];

  return (
    <div className="scr">
      <div className="scr__chrome">
        <span className="scr__url">{frame}</span>
      </div>

      <motion.div
        key={`${screen.title}|${screen.tone}`}
        className={`scr__body scr__body--${tone}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.32, ease: EASE }}
      >
        <span className={`scr__glyph scr__glyph--${tone}`}>
          <ScreenGlyph tone={screen.tone} />
        </span>
        <span className={`scr__head scr__head--${tone}`}>{screen.title}</span>
        {screen.body && <span className="scr__sub">{screen.body}</span>}
        {screen.button && <span className="scr__btn">{screen.button}</span>}
      </motion.div>
    </div>
  );
}

function RunView({ scenario, side, cursor }: { scenario: Scenario; side: Side; cursor: number }) {
  const run = scenario[side];
  const shown = run.beats.slice(0, cursor);

  return (
    <div className={`scn__run pane--${side}`}>
      <Phone frame={scenario.frame} screen={screenAt(run, cursor)} />

      <ol className="alist">
        {shown.map((beat, i) => {
          const tone = rowTone(beat, side);
          const icon = STATUS_ICON[beat.status];
          // Only the newest row spins. A row further up is history, and a
          // spinner that never stops reads as something still going wrong.
          const spinning = beat.status === 'running' && i === shown.length - 1;

          return (
            <motion.li
              key={beat.id}
              className={`arow arow--${tone} is-${beat.status}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <span className="arow__mark" aria-hidden>
                {spinning ? (
                  <span className="arow__spinner" />
                ) : icon ? (
                  <Icon name={icon} size={28} strokeWidth={2.6} />
                ) : (
                  <span className="arow__past" />
                )}
              </span>
              <span className="arow__text">{beat.text}</span>
              {beat.at && <span className="arow__at">{beat.at}</span>}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function SummaryView({ scenario }: { scenario: Scenario }) {
  const sides: Side[] = ['v8', 'v9'];

  return (
    <div className="scn__summary">
      <div className="scn__cmp">
        {sides.map((side) => {
          const run = scenario[side];
          return (
            <section key={side} className={`scn__card pane--${side} scn__card--${side}`}>
              <h3 className="scn__card-title">{SIDE_TITLE[side]}</h3>
              <Phone frame={scenario.frame} screen={screenAt(run, run.beats.length)} />
              <p className="scn__card-outcome">{run.outcome}</p>
            </section>
          );
        })}
      </div>

      <p className="scn__takeaway">
        <span className="scn__takeaway-rule" aria-hidden />
        {scenario.takeaway}
      </p>
    </div>
  );
}

export interface ScenarioStageProps {
  scenario: Scenario;
  /** The deck's build step for this slide. */
  step: number;
}

export function ScenarioStage({ scenario, step }: ScenarioStageProps) {
  const phase = phaseAt(scenario, step);
  const phaseKey = phase.kind === 'run' ? phase.side : 'summary';

  return (
    <div className="sim" data-sim={scenario.name} data-phase={phaseKey}>
      <header className="scn__head">
        <span className="scn__icon" aria-hidden>
          <Icon name={scenario.icon} size={46} strokeWidth={1.9} />
        </span>
        <h2 className="scn__headline">{scenario.headline}</h2>
        {phase.kind === 'run' && (
          <motion.span
            key={phase.side}
            className={`scn__phase scn__phase--${phase.side}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {SIDE_TITLE[phase.side]}
          </motion.span>
        )}
      </header>

      <motion.div
        key={phaseKey}
        className="scn__body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        {phase.kind === 'run' ? (
          <RunView scenario={scenario} side={phase.side} cursor={phase.cursor} />
        ) : (
          <SummaryView scenario={scenario} />
        )}
      </motion.div>
    </div>
  );
}

export default ScenarioStage;

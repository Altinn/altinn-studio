import { motion } from 'framer-motion';
import { Icon, type IconName } from '../../components';
import { phaseAt, screenAt, type Beat, type RowStatus, type Scenario, type Screen, type ScreenTone } from './scenario';
import { SIDE_TITLE, type Side, type SimTone } from './types';

/**
 * THE ONE SCENARIO TEMPLATE.
 *
 * The same accident, told side by side: today (v8) on the left, with the
 * process engine (v9) on the right. Every press of `→` lands the next line on
 * both sides at once, and a last press shows the two outcomes. The slide's own
 * header carries the title and the one sentence saying what goes wrong.
 *
 *   ┌ Med v8 ─────────────────────────┐ ┌ Med v9 ─────────────────────────┐
 *   │  phone  │ line 1                │ │  phone  │ line 1                │
 *   │         │ line 2 …              │ │         │ line 2 …              │
 *   └─────────────────────────────────┘ └─────────────────────────────────┘
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

function RunColumn({ scenario, side, cursor }: { scenario: Scenario; side: Side; cursor: number }) {
  const run = scenario[side];
  const shown = run.beats.slice(0, cursor);

  return (
    <section className={`scn__col pane--${side} scn__col--${side}`}>
      <h3 className="scn__col-title">{SIDE_TITLE[side]}</h3>
      <div className="scn__col-body">
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
                    <Icon name={icon} size={24} strokeWidth={2.6} />
                  ) : (
                    <span className="arow__past" />
                  )}
                </span>
                <span className="arow__text">{beat.text}</span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
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
              <ul className="scn__card-details">
                {run.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
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
  const phaseKey = phase.kind === 'run' ? 'run' : 'summary';

  return (
    <div className="sim" data-sim={scenario.name} data-phase={phaseKey}>
      <motion.div
        key={phaseKey}
        className="scn__body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        {phase.kind === 'run' ? (
          // Same frame as the comparison: the two columns fill the same box, and an
          // invisible takeaway holds its line, so the last press swaps the
          // contents without moving or resizing either box.
          <div className="scn__summary">
            <div className="scn__pair">
              <RunColumn scenario={scenario} side="v8" cursor={phase.cursor} />
              <RunColumn scenario={scenario} side="v9" cursor={phase.cursor} />
            </div>
            <p className="scn__takeaway is-placeholder" aria-hidden>
              <span className="scn__takeaway-rule" />
              {scenario.takeaway}
            </p>
          </div>
        ) : (
          <SummaryView scenario={scenario} />
        )}
      </motion.div>
    </div>
  );
}

export default ScenarioStage;

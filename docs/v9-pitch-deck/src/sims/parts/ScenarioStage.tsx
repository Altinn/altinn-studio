import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon, type IconName } from '../../components';
import { screenAt, type ActionRow, type RowStatus, type Scenario, type Screen, type ScreenTone } from './scenario';
import { useScenario, useSimKeys } from './useScenario';
import { SIDE_TITLE, type Side, type SimTone } from './types';

/**
 * THE ONE SIMULATION TEMPLATE.
 *
 * Every scenario in the deck is this component plus a data file. The shape is
 * fixed on purpose — the audience learns to read it once, on the first
 * simulation, and then only the story changes:
 *
 *   ┌ one sentence + one icon: what goes wrong ───────────────────────┐
 *   │  I dag (v8)                    │  Med prosessmotor (v9)         │
 *   │  what ONE person sees          │  what that same person sees    │
 *   │  the short list of what happe… │  the same list, other ending   │
 *   └ one sentence: what that means ─────────────────────────────────┘
 *   ▁▁▁▁▁▂▂▂▂▂ the rail: one marker per beat, click to jump
 *
 * There are no pods, leases or status codes in here. The plumbing is explained
 * once, on the architecture slide; these scenes are about the person.
 */

/* ---------------------------------------------------------------
   Tone resolution
   --------------------------------------------------------------- */

/** Blue is v9's colour; `sims.css` demotes it to plain ink inside the v8 column. */
const SCREEN_TONE: Record<ScreenTone, SimTone> = {
  idle: 'muted',
  busy: 'accent',
  wait: 'warning',
  ok: 'success',
  bad: 'danger',
};

/** `null` means the row (or screen) draws a spinner instead of a glyph. */
const STATUS_ICON: Record<RowStatus, IconName | null> = {
  running: null,
  ok: 'check',
  fail: 'x',
  wait: 'clock',
  info: 'activity',
};

/**
 * Rows are identical on both sides until the scenario diverges — same words,
 * same tone — because that is what makes the split visible when it comes. After
 * it, v8 spends the cautionary gold and red, and v9 stays blue and green.
 */
function rowTone(row: ActionRow, side: Side, shared: boolean): SimTone {
  if (row.tone) return row.tone;
  if (shared) return row.status === 'fail' ? 'danger' : 'neutral';
  if (side === 'v8') {
    if (row.status === 'fail') return 'danger';
    if (row.status === 'ok') return 'neutral';
    return 'warning';
  }
  if (row.status === 'ok') return 'success';
  if (row.status === 'fail') return 'danger';
  return 'accent';
}

/* ---------------------------------------------------------------
   The screen mock — one person's phone, laptop or system status
   --------------------------------------------------------------- */

function ScreenGlyph({ tone }: { tone: ScreenTone }) {
  if (tone === 'busy') return <span className="scr__spinner" aria-hidden />;
  const icon = tone === 'ok' ? 'check' : tone === 'bad' ? 'x' : tone === 'wait' ? 'clock' : null;
  if (!icon) return <span className="scr__dot" aria-hidden />;
  return <Icon name={icon} size={30} strokeWidth={2.6} />;
}

function ScreenMock({
  device,
  frame,
  screen,
}: {
  device: Scenario['device'];
  frame: string;
  screen: Screen;
}) {
  const tone = SCREEN_TONE[screen.tone];

  return (
    <div className={`scr scr--${device}`}>
      <div className="scr__chrome">
        {device === 'phone' ? (
          <span className="scr__url">{frame}</span>
        ) : (
          <>
            <span className="scr__dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="scr__title">{frame}</span>
          </>
        )}
      </div>

      <motion.div
        key={`${screen.title}|${screen.tone}`}
        className={`scr__body scr__body--${tone}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="scr__state">
          <span className={`scr__glyph scr__glyph--${tone}`}>
            <ScreenGlyph tone={screen.tone} />
          </span>
          <span className="scr__lines">
            <span className={`scr__head scr__head--${tone}`}>{screen.title}</span>
            {screen.body && <span className="scr__sub">{screen.body}</span>}
          </span>
        </div>

        {screen.rows && (
          <ul className={screen.mono ? 'scr__rows scr__rows--mono' : 'scr__rows'}>
            {screen.rows.map((row) => (
              <li key={row.label} className={`scr__row scr__row--${SCREEN_TONE[row.tone ?? 'idle']}`}>
                <span className="scr__row-label">{row.label}</span>
                {row.value && <span className="scr__row-value">{row.value}</span>}
              </li>
            ))}
          </ul>
        )}

        {screen.button && (
          <span
            className={`scr__btn${screen.button.pressed ? ' is-pressed' : ''}`}
            data-pressed={screen.button.pressed ? 'true' : 'false'}
          >
            {screen.button.label}
          </span>
        )}
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------
   One column: the screen, then the list of what happened
   --------------------------------------------------------------- */

function Column({
  scenario,
  side,
  cursor,
}: {
  scenario: Scenario;
  side: Side;
  cursor: number;
}) {
  const shown = scenario.beats.slice(0, Math.max(0, cursor));
  const paneTone = side === 'v8' ? 'warning' : 'accent';

  return (
    <section className={`pane pane--${side} pane--${paneTone}`}>
      <h3 className="pane__title">{SIDE_TITLE[side]}</h3>

      <ScreenMock
        device={scenario.device}
        frame={scenario.frame[side]}
        screen={screenAt(scenario, side, cursor)}
      />

      <ol className="alist">
        {shown.map((beat, i) => {
          const row = beat[side];
          const tone = rowTone(row, side, i < scenario.divergeAt);
          const icon = STATUS_ICON[row.status];
          // Only the newest row spins. A row four beats back is history, and a
          // spinner that never stops reads as something still going wrong.
          const spinning = row.status === 'running' && i === shown.length - 1;

          return (
            <motion.li
              key={beat.id}
              className={`arow arow--${tone} is-${row.status}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="arow__mark" aria-hidden>
                {spinning ? (
                  <span className="arow__spinner" />
                ) : icon ? (
                  <Icon name={icon} size={22} strokeWidth={2.6} />
                ) : (
                  <span className="arow__past" />
                )}
              </span>
              <span className="arow__text">{row.text}</span>
              {row.at && <span className="arow__at">{row.at}</span>}
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------
   The rail — one marker per beat, and the only control on screen
   --------------------------------------------------------------- */

function BeatRail({
  scenario,
  cursor,
  progress,
  playing,
  done,
  onJump,
  onToggle,
}: {
  scenario: Scenario;
  cursor: number;
  progress: number;
  playing: boolean;
  done: boolean;
  onJump: (beat: number) => void;
  onToggle: () => void;
}) {
  return (
    <div className="brail">
      <ol className="brail__track">
        {scenario.beats.map((beat, i) => {
          const fill = i < cursor ? 1 : i === cursor ? progress : 0;
          return (
            <li key={beat.id} className="brail__seg">
              <button
                type="button"
                className="brail__hit"
                title={`Hopp til «${beat.label}»`}
                onClick={(e) => {
                  e.stopPropagation();
                  onJump(i);
                }}
              >
                <span className="brail__bar">
                  <span className="brail__fill" style={{ width: `${Math.round(fill * 100)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className="brail__btn"
        title="Mellomrom"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <span className="brail__glyph" aria-hidden>
          {done ? '↻' : playing ? '❚❚' : '▶'}
        </span>
        {done ? 'Spill igjen' : playing ? 'Pause' : 'Spill av'}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------
   The stage
   --------------------------------------------------------------- */

export interface ScenarioStageProps {
  scenario: Scenario;
  /**
   * `false` freezes the scene on its end state and schedules no timers — used
   * for overview thumbnails and deterministic captures.
   */
  autoplay?: boolean;
}

export function ScenarioStage({ scenario, autoplay = true }: ScenarioStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const run = useScenario(scenario, rootRef, autoplay);
  useSimKeys(run.live, run.toggle, run.replay);

  return (
    <div
      ref={rootRef}
      className={['sim', run.live && 'is-live', !run.playing && !run.done && 'is-paused']
        .filter(Boolean)
        .join(' ')}
      data-sim={scenario.name}
      data-cursor={run.cursor}
      data-playing={run.playing ? 'true' : 'false'}
      data-done={run.done ? 'true' : 'false'}
      {...(run.live ? { onClick: run.toggle } : {})}
    >
      <header className="scn__head">
        <span className="scn__icon" aria-hidden>
          <Icon name={scenario.icon} size={44} strokeWidth={1.9} />
        </span>
        <h2 className="scn__headline">{scenario.headline}</h2>
      </header>

      <div className="scn__cols">
        <Column scenario={scenario} side="v8" cursor={run.cursor} />
        <Column scenario={scenario} side="v9" cursor={run.cursor} />
      </div>

      <p className="scn__takeaway">
        <span className="scn__takeaway-rule" aria-hidden />
        {scenario.takeaway}
      </p>

      <BeatRail
        scenario={scenario}
        cursor={run.cursor}
        progress={run.beatProgress}
        playing={run.playing}
        done={run.done}
        onJump={run.jumpToBeat}
        onToggle={run.toggle}
      />
    </div>
  );
}

export default ScenarioStage;

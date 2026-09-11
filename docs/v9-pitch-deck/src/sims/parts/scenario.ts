import type { IconName } from '../../components';
import type { SimTone } from './types';

/**
 * A scenario is a *script*, not a state machine: a flat list of beats, each one
 * holding one line of what happens to the person on the v8 side and one line of
 * what happens to them with the engine, at the same moment. The two columns
 * therefore always hold the same number of rows, which is what makes the
 * divergence readable — row 4 on the left sits next to row 4 on the right.
 *
 * A beat may also hand either side a new **screen**: what that one person is
 * looking at right then. That is the only other thing that moves.
 */

/** What an action row says about itself. Drives its icon and default tone. */
export type RowStatus =
  | 'running' // in progress — spinner
  | 'ok' // done, and it held
  | 'fail' // broken, lost, refused
  | 'wait' // parked / counting down — not a failure
  | 'info'; // a statement about how it works

/** One line in a column's action list. */
export interface ActionRow {
  /**
   * One line of klarspråk. Keep it under ~48 characters: a row is one line at
   * 25px inside a 600px column, and a longer line is clipped rather than
   * wrapped so the two columns can never fall out of step.
   */
  text: string;
  status: RowStatus;
  /** Small right-aligned note — a clock time, «neste morgen», «6 min». */
  at?: string;
  /** Overrides the tone the status and the side imply. */
  tone?: SimTone;
}

/** Mood of a screen. Drives its glyph and its colour. */
export type ScreenTone = 'idle' | 'busy' | 'wait' | 'ok' | 'bad';

/** The three frames a person looks at in these scenarios. */
export type Device =
  | 'phone' // the citizen
  | 'laptop' // the ops engineer
  | 'card'; // a system's own status

/** One small line inside a screen: a status card row, a dashboard row, a log line. */
export interface ScreenRow {
  label: string;
  /** Right-hand value. Omit for a log line. */
  value?: string;
  tone?: ScreenTone;
}

/** What one person has in front of them at a given beat. */
export interface Screen {
  /** The one thing the screen says, in the words the product actually uses. */
  title: string;
  /** One supporting line, if the screen has one. */
  body?: string;
  tone: ScreenTone;
  /** Rows under the headline — a status card, a dashboard, a log. */
  rows?: readonly ScreenRow[];
  /** Renders `rows` as monospace log lines rather than label/value pairs. */
  mono?: boolean;
  /** A single button drawn at the foot of the screen. */
  button?: { label: string; pressed?: boolean };
}

/** One moment in the scenario: what each side sees and does. */
export interface Beat {
  /** Stable id — the React key, and a debugging handle. */
  id: string;
  /** Milliseconds after the previous beat. */
  gap: number;
  /** 1–3 words, used as the rail marker's tooltip. */
  label: string;
  v8: ActionRow;
  v9: ActionRow;
  /** New screen for that side from this beat onwards. */
  v8Screen?: Screen;
  v9Screen?: Screen;
}

export interface Scenario {
  /** CSS/debug hook, and the key the harness and the shot script use. */
  name: string;
  /** The one plain sentence at the top: what goes wrong. */
  headline: string;
  /** The one large flat icon beside it. */
  icon: IconName;
  device: Device;
  /** Chrome label on each column's frame — an address bar, a window title. */
  frame: { v8: string; v9: string };
  /** What each side is looking at before the first beat lands. */
  start: { v8: Screen; v9: Screen };
  beats: readonly Beat[];
  /**
   * Index of the first beat where the two columns stop saying the same thing.
   * Rows before it read identically on both sides and are toned identically;
   * from it on, v8 goes cautionary and v9 stays positive.
   */
  divergeAt: number;
  /** The one closing sentence. */
  takeaway: string;
  /** How long the finished scene is held before the run parks. */
  endHold: number;
}

/** Absolute times derived from a scenario's gaps — computed once per scenario. */
export interface Timeline {
  /** `beatAt[i]` — when beat `i` appears, in ms from the start of the run. */
  beatAt: readonly number[];
  /** `beatFrom[i]` — when beat `i` started counting down (the one before it). */
  beatFrom: readonly number[];
  /** Whole run, including `endHold`. */
  total: number;
}

export function buildTimeline(scenario: Scenario): Timeline {
  let at = 0;
  const beatFrom: number[] = [];
  const beatAt = scenario.beats.map((b) => {
    beatFrom.push(at);
    at += b.gap;
    return at;
  });

  const last = beatAt.length > 0 ? beatAt[beatAt.length - 1] : 0;
  return { beatAt, beatFrom, total: last + scenario.endHold };
}

/**
 * `cursor` counts the beats that have happened, so beat `i` is on screen once
 * `cursor > i`. Everything on stage is derived from this one number, which is
 * why jumping, replaying and unmounting are all safe: nothing is accumulated.
 */
export function cursorAt(timeline: Timeline, elapsed: number): number {
  let n = 0;
  for (const t of timeline.beatAt) {
    if (t <= elapsed) n++;
    else break;
  }
  return n;
}

/**
 * The screen a side is looking at once `cursor` beats have happened: the most
 * recent one a beat handed it, or the scenario's starting screen.
 */
export function screenAt(scenario: Scenario, side: 'v8' | 'v9', cursor: number): Screen {
  const key = side === 'v8' ? 'v8Screen' : 'v9Screen';
  for (let i = Math.min(cursor, scenario.beats.length) - 1; i >= 0; i--) {
    const screen = scenario.beats[i][key];
    if (screen) return screen;
  }
  return scenario.start[side];
}

import type { IconName } from '../../components';
import type { Side, SimTone } from './types';

/**
 * A scenario is a *script*: the same accident told twice, first as it plays out
 * today (v8) and then as it plays out with the process engine (v9). Each run is
 * a short list of beats, and one press of `→` lands one beat, so the presenter
 * sets the pace. A last press shows the two outcomes side by side.
 */

/** What an action row says about itself. Drives its icon and default tone. */
export type RowStatus =
  | 'running' // in progress — spinner while it is the newest row
  | 'ok' // done, and it held
  | 'fail' // broken, lost, refused
  | 'wait'; // left to someone, or counting down — not a failure in itself

/** Mood of a screen. Drives its glyph and its colour. */
export type ScreenTone = 'idle' | 'busy' | 'wait' | 'ok' | 'bad';

/** What the person has in front of them at a given beat. */
export interface Screen {
  /** The one thing the screen says, in the words the product actually uses. */
  title: string;
  /** One supporting line, if the screen has one. */
  body?: string;
  tone: ScreenTone;
  /** A single button drawn at the foot of the screen. */
  button?: string;
}

/** One moment in a run: one line in the list, and maybe a new screen. */
export interface Beat {
  /** Stable id — the React key. */
  id: string;
  /**
   * One line of klarspråk. Keep it under ~44 characters: a row is one line at
   * 32px, and a longer line is clipped rather than wrapped.
   */
  text: string;
  status: RowStatus;
  /** Small right-aligned note — «to PDF-er», «neste dag». */
  at?: string;
  /** Overrides the tone the status and the side imply. */
  tone?: SimTone;
  /** New screen from this beat onwards. */
  screen?: Screen;
}

/** One telling of the scenario. */
export interface Run {
  /** What the person is looking at before the first beat lands. */
  start: Screen;
  beats: readonly Beat[];
  /** One sentence for the closing comparison. */
  outcome: string;
}

export interface Scenario {
  /** CSS/debug hook. */
  name: string;
  /** The one plain sentence at the top: what goes wrong. */
  headline: string;
  /** The one large flat icon beside it. */
  icon: IconName;
  /** Address bar on the phone. */
  frame: string;
  v8: Run;
  v9: Run;
  /** The one closing sentence under the comparison. */
  takeaway: string;
}

/** Build steps a scenario slide declares: every beat, the switch to v9, and the comparison. */
export function scenarioSteps(scenario: Scenario): number {
  return scenario.v8.beats.length + 1 + scenario.v9.beats.length + 1;
}

export type Phase = { kind: 'run'; side: Side; cursor: number } | { kind: 'summary' };

/**
 * Where the deck's build step puts the scenario. Step 0 is the v8 run before
 * its first beat; each step lands one beat; the step after the last v8 beat
 * restarts the scene on v9; the final step is the comparison.
 */
export function phaseAt(scenario: Scenario, step: number): Phase {
  const n8 = scenario.v8.beats.length;
  const n9 = scenario.v9.beats.length;
  if (step <= n8) return { kind: 'run', side: 'v8', cursor: Math.max(0, step) };
  if (step <= n8 + 1 + n9) return { kind: 'run', side: 'v9', cursor: step - n8 - 1 };
  return { kind: 'summary' };
}

/** The screen a run shows once `cursor` beats have landed. */
export function screenAt(run: Run, cursor: number): Screen {
  for (let i = Math.min(cursor, run.beats.length) - 1; i >= 0; i--) {
    const screen = run.beats[i].screen;
    if (screen) return screen;
  }
  return run.start;
}

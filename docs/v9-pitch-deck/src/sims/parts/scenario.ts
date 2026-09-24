import type { SimTone } from './types';

/**
 * A scenario is a *script*: the same accident told twice, as it plays out today
 * (v8) and with the process engine (v9), side by side. Both runs have the same
 * number of beats, and one press of `→` lands the next beat on both sides at
 * once, so row 3 on the left always sits next to row 3 on the right. A last
 * press shows the two outcomes.
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
   * One line of klarspråk. Keep it under ~34 characters: a row is one line at
   * 24px in a half-width column, and a longer line is clipped rather than
   * wrapped so the two columns can never fall out of step.
   */
  text: string;
  status: RowStatus;
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
  /** Up to three short supporting points under the outcome in the comparison. */
  details: readonly string[];
}

export interface Scenario {
  /** CSS/debug hook. */
  name: string;
  /** The slide title: the situation, in a few words. */
  title: string;
  /** The subtitle: what goes wrong, in one plain sentence. */
  headline: string;
  /** Address bar on the phone. */
  frame: string;
  v8: Run;
  v9: Run;
  /** The one closing sentence under the comparison. */
  takeaway: string;
}

/** The number of beats in each run. The two runs must match, row for row. */
function beatCount(scenario: Scenario): number {
  const n = scenario.v8.beats.length;
  if (scenario.v9.beats.length !== n) {
    throw new Error(`Scenario «${scenario.name}»: v8 has ${n} beats, v9 has ${scenario.v9.beats.length}`);
  }
  return n;
}

/** Build steps a scenario slide declares: every beat, then the comparison. */
export function scenarioSteps(scenario: Scenario): number {
  return beatCount(scenario) + 1;
}

export type Phase = { kind: 'run'; cursor: number } | { kind: 'summary' };

/**
 * Where the deck's build step puts the scenario. Step 0 is both phones before
 * the first beat; each step lands one beat on both sides; the final step is
 * the comparison.
 */
export function phaseAt(scenario: Scenario, step: number): Phase {
  const n = beatCount(scenario);
  return step <= n ? { kind: 'run', cursor: Math.max(0, step) } : { kind: 'summary' };
}

/** The screen a run shows once `cursor` beats have landed. */
export function screenAt(run: Run, cursor: number): Screen {
  for (let i = Math.min(cursor, run.beats.length) - 1; i >= 0; i--) {
    const screen = run.beats[i].screen;
    if (screen) return screen;
  }
  return run.start;
}

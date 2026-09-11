import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { buildTimeline, cursorAt, type Scenario, type Timeline } from './scenario';

/**
 * How often the run wakes up. Everything on stage is derived from `elapsed`, so
 * this is the only clock in a simulation — 10 Hz is plenty for a stage and costs
 * a fraction of a per-frame render. The two moving parts (the spinner and the
 * rail fill) are CSS and run at full frame rate regardless.
 */
const TICK_MS = 100;

/**
 * Below this width the simulation is a thumbnail, not a stage: the overview grid
 * renders every slide live at 288px. Thumbnails get the end state and no timers.
 */
const STAGE_MIN_WIDTH = 420;

export interface SimRun {
  timeline: Timeline;
  /** Beats that have happened. Beat `i` is on screen once `cursor > i`. */
  cursor: number;
  /** 0…1 through the beat currently counting down — drives the rail fill. */
  beatProgress: number;
  /** The run is on a stage and drives itself. `false` for thumbnails/captures. */
  live: boolean;
  playing: boolean;
  done: boolean;
  /** Pause, resume, or restart a finished run. */
  toggle: () => void;
  replay: () => void;
  /** Jump the run to the moment beat `i` lands. */
  jumpToBeat: (beat: number) => void;
}

/**
 * The autoplay controller.
 *
 * Everything on screen is derived from `elapsed`, so pausing, replaying and
 * jumping to a beat are all one `setState` — and unmounting cancels the only
 * timer there is. Navigating away and back therefore restarts a simulation from
 * zero with nothing carried over.
 */
export function useScenario(
  scenario: Scenario,
  rootRef: RefObject<HTMLElement>,
  autoplay: boolean,
): SimRun {
  const timeline = useMemo(() => buildTimeline(scenario), [scenario]);
  const { total } = timeline;

  const [live, setLive] = useState(autoplay);
  const [elapsed, setElapsed] = useState(autoplay ? 0 : total);
  const [playing, setPlaying] = useState(autoplay);

  // One layout pass to work out whether this is a stage or a thumbnail. Done
  // here rather than through a prop so a sim stays correct wherever the deck
  // decides to render it.
  useLayoutEffect(() => {
    if (!autoplay) return;
    const el = rootRef.current;
    if (!el) return;
    const thumbnail =
      el.closest('.overview') !== null || el.getBoundingClientRect().width < STAGE_MIN_WIDTH;
    if (thumbnail) {
      setLive(false);
      setPlaying(false);
      setElapsed(total);
    }
  }, [autoplay, rootRef, total]);

  const done = elapsed >= total;

  useEffect(() => {
    if (!live || !playing || done) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      setElapsed((prev) => Math.min(total, prev + delta));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [live, playing, done, total]);

  const replay = useCallback(() => {
    setElapsed(0);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (elapsed >= total) {
      replay();
      return;
    }
    setPlaying((p) => !p);
  }, [elapsed, total, replay]);

  const jumpToBeat = useCallback(
    (beat: number) => {
      const at = timeline.beatAt[beat];
      if (at === undefined) return;
      setElapsed(at);
    },
    [timeline],
  );

  const cursor = cursorAt(timeline, elapsed);
  const pending = Math.min(cursor, timeline.beatAt.length - 1);
  const from = timeline.beatFrom[pending] ?? 0;
  const to = timeline.beatAt[pending] ?? 1;
  const span = Math.max(1, to - from);
  const beatProgress = Math.max(0, Math.min(1, (elapsed - from) / span));

  return {
    timeline,
    cursor,
    beatProgress,
    live,
    playing,
    done,
    toggle,
    replay,
    jumpToBeat,
  };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * `space` pauses/resumes and `r` replays, while the simulation is on stage.
 *
 * Both are taken in the *capture* phase and stopped there, so the deck's own
 * window handler never sees them — on a simulation slide `space` belongs to the
 * scene, and `→` / `←` still move the deck.
 */
export function useSimKeys(enabled: boolean, onToggle: () => void, onReplay: () => void) {
  const handlers = useRef({ onToggle, onReplay });
  handlers.current = { onToggle, onReplay };

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
        handlers.current.onToggle();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        e.stopPropagation();
        handlers.current.onReplay();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);
}

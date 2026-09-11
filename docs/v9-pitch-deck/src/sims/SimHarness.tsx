import { useState } from 'react';
import { SimDrift, SimInnbygger, SimMottaker } from './index';
import type { SimProps } from './types';

/**
 * DEV ONLY — the deck never imports this.
 *
 * Renders one simulation inside a real 1920x1080 `<Slide>` shell so a scene can
 * be watched (and screenshotted) on its own. Reachable at `?sim=innbygger`; see
 * `scripts/sim-shots.mjs`. The simulation drives itself, so the harness has no
 * step control — `space`, `r` and the rail are the controls.
 */
export const SIMS = {
  innbygger: { Component: SimInnbygger, title: 'Innbyggeren' },
  mottaker: { Component: SimMottaker, title: 'Mottakeren' },
  drift: { Component: SimDrift, title: 'Driftsvakta' },
} as const;

export type SimKey = keyof typeof SIMS;

export const SIM_KEYS = Object.keys(SIMS) as SimKey[];

interface SimHarnessProps {
  sim?: SimKey;
  autoplay?: boolean;
  /** Hides the switcher — the screenshot script clips to the slide anyway. */
  chrome?: boolean;
}

export function SimHarness({
  sim: initialSim = 'innbygger',
  autoplay = true,
  chrome = true,
}: SimHarnessProps) {
  const [sim, setSim] = useState<SimKey>(initialSim);
  const [run, setRun] = useState(0);

  const { Component, title } = SIMS[sim];
  const props: SimProps = { autoplay };

  return (
    <div className="simharness">
      {/* The same shell the deck gives a simulation slide — chip on top, the
          scene in `.s-simstage` — so what the harness shows is what the stage
          shows, down to the pixel. */}
      <section className="slide slide--full s-bleed" data-harness-slide data-sim={sim}>
        <div className="s-simchip">
          <span className="s-simchip__no">Simulering</span>
          <span className="s-simchip__title">{title}</span>
        </div>
        <div className="s-simstage">
          {/* Remounting on the key is exactly what the deck does when you
              navigate back onto a simulation slide — so this is also the test
              that a scene resets cleanly. */}
          <Component key={`${sim}-${run}`} {...props} />
        </div>
      </section>

      {chrome && (
        <div className="simharness__bar">
          {SIM_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === sim}
              onClick={() => {
                setSim(key);
                setRun((n) => n + 1);
              }}
            >
              {key}
            </button>
          ))}
          <button type="button" onClick={() => setRun((n) => n + 1)}>
            remount
          </button>
        </div>
      )}
    </div>
  );
}

export default SimHarness;

import type { ReactElement } from 'react';
import { SIMS, SimHarness, type SimKey } from './SimHarness';

function isSimKey(value: string | null): value is SimKey {
  return value !== null && Object.prototype.hasOwnProperty.call(SIMS, value);
}

/**
 * DEV ONLY. Returns the simulation harness when the URL carries `?sim=<key>`,
 * and `null` otherwise so `src/main.tsx` falls straight through to the deck.
 *
 *   /?sim=innbygger              → SimInnbygger, autoplaying from the start
 *   /?sim=drift&chrome=0        → no switcher (used by scripts/sim-shots.mjs)
 *   /?sim=mottaker&autoplay=0   → frozen on the end state, no timers
 */
export function harnessRoot(): ReactElement | null {
  if (typeof window === 'undefined') return null;

  const q = new URLSearchParams(window.location.search);
  const sim = q.get('sim');
  if (!isSimKey(sim)) return null;

  return (
    <SimHarness sim={sim} autoplay={q.get('autoplay') !== '0'} chrome={q.get('chrome') !== '0'} />
  );
}

/**
 * The three live simulations.
 *
 * All three are the same component — `parts/ScenarioStage` — with a different
 * data file: one sentence saying what goes wrong, two columns showing what one
 * person sees today and with the engine, and one sentence saying what that
 * means. Each one **runs itself**: on mount it plays its beats, writing one row
 * at a time into each column and swapping that person's screen as it goes, then
 * parks on the end state. The presenter pauses with `space` (or a click),
 * replays with `r`, and can click a marker on the rail to jump to a beat.
 *
 *   import { SimInnbygger, SIM_STEPS } from '../sims';
 *   { id: 'sim-innbygger', component: InnbyggerSlide, steps: SIM_STEPS.innbygger }  // 0
 */
import type React from 'react';

import { SimDrift as SimDriftImpl } from './SimDrift';
import { SimInnbygger as SimInnbyggerImpl } from './SimInnbygger';
import { SimMottaker as SimMottakerImpl } from './SimMottaker';
import type { SimProps } from './types';

export type { SimProps };

/** (1) The server restarts mid-submit — what it costs the person who clicked. */
export const SimInnbygger: React.FC<SimProps> = SimInnbyggerImpl;

/** (2) The receiving system is down for a while — waiting, retry, confirmed. */
export const SimMottaker: React.FC<SimProps> = SimMottakerImpl;

/** (3) A step fails for real at 03:00 — the log hunt, or the dashboard. */
export const SimDrift: React.FC<SimProps> = SimDriftImpl;

/**
 * A simulation consumes **no** build steps: it is autoplayed, not clicked
 * through. The export is kept — and kept per-simulation — so the slide registry
 * goes on compiling, and so a slide that says `steps: SIM_STEPS.innbygger` is
 * saying something true.
 */
export const SIM_AUTOPLAY_STEPS = 0;

/** Number of forward build-steps each simulation consumes. All zero. */
export const SIM_STEPS = {
  innbygger: SIM_AUTOPLAY_STEPS,
  mottaker: SIM_AUTOPLAY_STEPS,
  drift: SIM_AUTOPLAY_STEPS,
} as const;

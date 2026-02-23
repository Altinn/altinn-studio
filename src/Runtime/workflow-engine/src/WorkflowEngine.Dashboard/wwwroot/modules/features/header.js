/* Header — engine status badges + capacity meters */

import { dom } from '../core/state.js';

/** @param {import('../core/state.js').EngineStatus} s */
export const updateStatusBadges = (s) => {
  let cls = 'stopped';
  let label = 'Stopped';

  if (s.running) {
    cls = 'running'; label = 'Running';
    if (s.idle)      { cls = 'idle';       label = 'Idle';       }
    if (s.queueFull) { cls = 'queue-full'; label = 'Queue Full'; }
    if (!s.healthy)  { cls = 'unhealthy';  label = 'Unhealthy';  }
  }
  if (s.disabled) { cls = 'disabled'; label = 'Disabled'; }

  dom.engineIcon.setAttribute('class', `engine-icon ${cls}`);
  dom.engineIcon.setAttribute('title', label);
  dom.engineStatusLabel.className = 'engine-status-label';
};

/* ── Capacity meters ─────────────────────────────────────── */

/**
 * @param {string} id
 * @param {import('../core/state.js').SlotStatus} slot
 */
const updateMeter = (id, slot) => {
  const fill = /** @type {HTMLElement} */ (document.getElementById(`meter-${id}`));
  const val  = /** @type {HTMLElement} */ (document.getElementById(`meter-${id}-val`));
  const pct  = slot.total > 0 ? (slot.used / slot.total) * 100 : 0;

  fill.style.width = `${Math.max(pct, 0.5)}%`;
  fill.className = `meter-fill ${pct < 50 ? 'low' : pct < 80 ? 'mid' : 'high'}`;
  val.textContent = `${slot.used.toLocaleString()} / ${slot.total.toLocaleString()}`;
};

/** @param {{ inbox: import('../core/state.js').SlotStatus, db: import('../core/state.js').SlotStatus, http: import('../core/state.js').SlotStatus }} cap */
export const updateCapacity = (cap) => {
  updateMeter('inbox', cap.inbox);
  updateMeter('db',    cap.db);
  updateMeter('http',  cap.http);
};

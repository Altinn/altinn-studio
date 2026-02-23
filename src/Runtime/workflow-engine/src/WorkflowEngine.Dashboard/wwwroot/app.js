// @ts-check
/* ============================================================
 *  Dashboard entry point — wires modules together, runs init()
 * ============================================================ */

import { engineUrl, setEngineUrl } from './modules/core/state.js';
import { connectSSE, watchForChanges, bindSSECallbacks } from './modules/core/sse.js';
import { syncUrl, restoreUrl, bindUrlCallbacks } from './modules/core/url.js';
import { updateTimers } from './modules/shared/timers.js';
import { updateStatusBadges, updateCapacity } from './modules/features/header.js';
import { updateScheduledBadge, bindScheduledCallbacks } from './modules/features/scheduled.js';
import { updateLiveWorkflows, bindLiveCallbacks } from './modules/features/live.js';
import { updateRecentWorkflows, bindRecentCallbacks } from './modules/features/recent.js';
import { applyFilter, mergeDiscoveredOrgsAndApps, switchTab, bindFilterCallbacks } from './modules/features/filters.js';
import { loadQuery } from './modules/features/query.js';
import { bindThemeCallbacks } from './modules/features/theme.js';

// Side-effect imports: these modules register window.* handlers and DOM listeners on load
import './modules/features/modal.js';

/* ── Wire up late-bound callbacks to break circular dependencies ── */

bindSSECallbacks({ applyFilter, syncUrl, loadQuery });
bindUrlCallbacks({ switchTab, loadQuery, applyFilter });
bindScheduledCallbacks({ applyFilter, syncUrl });
bindLiveCallbacks({ mergeDiscoveredOrgsAndApps, applyFilter });
bindRecentCallbacks({ mergeDiscoveredOrgsAndApps, applyFilter });
bindFilterCallbacks({ syncUrl, loadQuery });
bindThemeCallbacks({ syncUrl });

/* ============================================================
 *  4. DASHBOARD UPDATE  (entry point for every SSE message)
 * ============================================================ */

/** @param {import('./modules/core/state.js').DashboardPayload} data */
const updateDashboard = (data) => {
  updateStatusBadges(data.engineStatus);
  updateCapacity(data.capacity);
  updateScheduledBadge(data.scheduledCount);
  updateLiveWorkflows(data.workflows);
};

/* ============================================================
 *  INIT — fetch engine URL from config, then connect SSE
 * ============================================================ */

const init = async () => {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    setEngineUrl(config.engineUrl || '');
  } catch {
    console.warn('Failed to load config, using same-origin for engine URL');
  }

  restoreUrl();
  connectSSE(`${engineUrl}/dashboard/stream`, updateDashboard, { showStatus: true });
  connectSSE(`${engineUrl}/dashboard/stream/recent`, (data) => updateRecentWorkflows(/** @type {import('./modules/core/state.js').Workflow[]} */ (data)));
  requestAnimationFrame(updateTimers);
  watchForChanges();
};

init();

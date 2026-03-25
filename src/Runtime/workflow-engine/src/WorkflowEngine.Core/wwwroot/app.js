// @ts-check
/* ============================================================
 *  Dashboard entry point — wires modules together, runs init()
 * ============================================================ */

import { connectSSE, watchForChanges } from './modules/core/sse.js';
import { syncUrl, restoreUrl, bindUrlCallbacks } from './modules/features/url.js';
import { updateTimers } from './modules/shared/timers.js';
import { bindSectionCallbacks } from './modules/shared/section.js';
import { updateStatusBadges, updateCapacity } from './modules/features/header.js';
import {
    updateScheduledBadge,
    loadScheduled,
    bindScheduledCallbacks,
} from './modules/features/scheduled.js';
import { updateLiveWorkflows, bindLiveCallbacks } from './modules/features/live.js';
import { updateRecentWorkflows, bindRecentCallbacks } from './modules/features/recent.js';
import {
    applyFilter,
    mergeDiscoveredLabels,
    switchTab,
    fetchLabelValues,
    bindFilterCallbacks,
} from './modules/features/filters.js';
import { loadQuery } from './modules/features/query.js';
import { bindThemeCallbacks } from './modules/features/theme.js';

// Side-effect imports: these modules register window.* handlers and DOM listeners on load
import './modules/features/modal.js';
import './modules/features/settings.js';
import './modules/features/state-modal.js';

/* ── Wire up late-bound callbacks to break circular dependencies ── */

bindUrlCallbacks({ switchTab, loadQuery, applyFilter });
bindSectionCallbacks({ loadScheduled, loadQuery, syncUrl });
bindScheduledCallbacks({ applyFilter });
bindLiveCallbacks({ mergeDiscoveredLabels, applyFilter });
bindRecentCallbacks({ mergeDiscoveredLabels, applyFilter });
bindFilterCallbacks({ syncUrl, loadQuery });
bindThemeCallbacks({ syncUrl });

/* ── Dashboard update (entry point for every SSE message) ── */

/** @param {import('./modules/core/state.js').DashboardPayload} data */
const updateDashboard = (data) => {
    updateStatusBadges(data.engineStatus);
    updateCapacity(data.capacity);
    updateScheduledBadge(data.scheduledCount);
};

/* ── Init ────────────────────────────────────────────────── */

const init = () => {
    restoreUrl();
    connectSSE('/dashboard/stream', updateDashboard, {
        showStatus: true,
        onConnect: fetchLabelValues,
    });
    connectSSE('/dashboard/stream/live', (data) => {
        const d =
            /** @type {{ active?: import('./modules/core/state.js').Workflow[], recent?: import('./modules/core/state.js').Workflow[] }} */ (
                data
            );
        // Recent keys needed so active exit animation is skipped for workflows moving to recent
        const recentKeys = d.recent
            ? new Set(d.recent.map((w) => w.idempotencyKey))
            : null;
        if (d.active !== undefined) updateLiveWorkflows(d.active, recentKeys);
        if (d.recent !== undefined) updateRecentWorkflows(d.recent);
    });
    requestAnimationFrame(updateTimers);
    watchForChanges();
};

init();

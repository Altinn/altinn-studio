/* Scheduled workflows — count badge + on-demand detail */

import { dom, state, engineUrl, workflowData } from '../core/state.js';
import { buildScheduledCardHTML, buildCompactScheduledCardHTML } from '../shared/cards.js';

/** Late-bound references */
/** @type {() => void} */
let _applyFilter = () => {};

/** @param {{ applyFilter: () => void }} fns */
export const bindScheduledCallbacks = (fns) => {
  _applyFilter = fns.applyFilter;
};

let lastScheduledCount = -1;

/** @param {number} count */
export const updateScheduledBadge = (count) => {
  if (count !== lastScheduledCount) {
    lastScheduledCount = count;
    loadScheduled();
  }
};

export const loadScheduled = async () => {
  if (dom.scheduledSection.classList.contains('collapsed')) return;

  try {
    const res = await fetch(`${engineUrl}/dashboard/scheduled`);
    /** @type {import('../core/state.js').Workflow[]} */
    const workflows = await res.json();

    dom.scheduledContainer.innerHTML = '';
    if (workflows.length === 0) {
      dom.scheduledContainer.innerHTML = '<div class="empty-state">No scheduled workflows</div>';
      return;
    }
    for (const wf of workflows) {
      const card = document.createElement('div');
      card.className = `workflow-card${state.compactSections.scheduled ? ' compact' : ''}`;
      card.style.animation = 'none';
      card.dataset.wfkey = wf.idempotencyKey;
      workflowData[wf.idempotencyKey] = wf;
      const msUntil = wf.startAt ? new Date(wf.startAt).getTime() - Date.now() : Infinity;
      card.dataset.status = msUntil < 10000 ? '10s' : msUntil < 60000 ? '1m' : msUntil < 300000 ? '5m' : 'later';
      card.innerHTML = state.compactSections.scheduled ? buildCompactScheduledCardHTML(wf) : buildScheduledCardHTML(wf);
      dom.scheduledContainer.appendChild(card);
    }
    _applyFilter();
  } catch { /* non-critical */ }
};



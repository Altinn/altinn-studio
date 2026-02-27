/* Live workflows — add / update / remove inbox cards */

import { dom, state } from '../core/state.js';
import { cssId } from '../core/helpers.js';
import { buildCardHTML, buildCompactCardHTML, createWorkflowCard, setCardFilterData } from '../shared/cards.js';
import { scrollPipelineToActive } from '../shared/pipeline.js';
import { notifyWorkflowChanged } from './state-modal.js';
import { notifyStepChanged } from './modal.js';

/** Late-bound references */
/** @type {() => void} */
let _mergeDiscoveredOrgsAndApps = () => {};
/** @type {() => void} */
let _applyFilter = () => {};

/** @param {{ mergeDiscoveredOrgsAndApps: () => void, applyFilter: () => void }} fns */
export const bindLiveCallbacks = (fns) => {
  _mergeDiscoveredOrgsAndApps = fns.mergeDiscoveredOrgsAndApps;
  _applyFilter = fns.applyFilter;
};

/** @param {import('../core/state.js').Workflow} wf */
const fingerprint = (wf) =>
  `${wf.status}|${wf.steps.map(s => `${s.status}:${s.retryCount}:${s.backoffUntil || ''}`).join(',')}`;

/** @param {import('../core/state.js').Workflow[]} workflows */
export const updateLiveWorkflows = (workflows) => {
  const currentKeys = new Set(workflows.map(w => w.idempotencyKey));

  // Animate out cards for workflows no longer in inbox
  for (const key of Object.keys(state.previousWorkflows)) {
    if (!currentKeys.has(key)) {
      const card = document.getElementById(`wf-${cssId(key)}`);
      if (card && !card.dataset.exiting) {
        const visible = card.offsetParent !== null;
        if (visible) {
          const failed = state.previousWorkflows[key]?.status === 'Failed';
          if (failed) card.classList.add('exit-fail');
          card.dataset.exiting = '1';
          card.style.animation = 'complete-exit 0.5s ease forwards';
          card.style.pointerEvents = 'none';
          card.addEventListener('animationend', () => {
            card.remove();
            if (!dom.liveContainer.querySelector('.workflow-card')) {
              dom.liveEmpty.style.display = 'block';
            }
          }, { once: true });
        } else {
          card.remove();
        }
      }
      delete state.previousWorkflows[key];
      delete state.workflowFingerprints[key];
      delete state.workflowTimers[key];
    }
  }

  // Add or update active workflow cards
  for (const wf of workflows) {
    const elId = `wf-${cssId(wf.idempotencyKey)}`;
    let card = document.getElementById(elId);

    const fp = fingerprint(wf);
    if (!card) {
      card = createWorkflowCard(wf, elId);
      dom.liveContainer.appendChild(card);
      state.workflowTimers[wf.idempotencyKey] = { startedAt: wf.executionStartedAt || wf.createdAt };
      state.workflowFingerprints[wf.idempotencyKey] = fp;
    } else if (state.workflowFingerprints[wf.idempotencyKey] !== fp) {
      const isCompact = card.classList.contains('compact');
      card.innerHTML = isCompact ? buildCompactCardHTML(wf) : buildCardHTML(wf);
      setCardFilterData(card, wf);
      if (!isCompact) scrollPipelineToActive(card);
      state.workflowFingerprints[wf.idempotencyKey] = fp;
      notifyWorkflowChanged(wf.idempotencyKey);
      notifyStepChanged(wf.idempotencyKey);
    }

    state.previousWorkflows[wf.idempotencyKey] = wf;
  }

  // Only show empty state immediately if no cards exist (including exiting ones)
  const hasCards = dom.liveContainer.querySelector('.workflow-card') !== null;
  const isEmpty = workflows.length === 0 && !hasCards;
  dom.liveEmpty.style.display = isEmpty ? 'block' : 'none';
  _mergeDiscoveredOrgsAndApps();
  _applyFilter();
};

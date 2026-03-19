/* Live workflows — add / update / remove inbox cards */

import { dom, state } from '../core/state.js';
import { cssId } from '../core/helpers.js';
import {
    buildCardHTML,
    buildCompactCardHTML,
    createWorkflowCard,
    setCardFilterData,
} from '../shared/cards.js';
import { scrollPipelineToActive } from '../shared/pipeline.js';
import { notifyStepChanged } from './modal.js';
import { notifyWorkflowChanged } from './state-modal.js';

/** Late-bound references */
/** @type {() => void} */
let _mergeDiscoveredLabels = () => {};
/** @type {() => void} */
let _applyFilter = () => {};

/** @param {{ mergeDiscoveredLabels: () => void, applyFilter: () => void }} fns */
export const bindLiveCallbacks = (fns) => {
    _mergeDiscoveredLabels = fns.mergeDiscoveredLabels;
    _applyFilter = fns.applyFilter;
};

/** @param {import('../core/state.js').Workflow} wf */
const fingerprint = (wf) =>
    `${wf.status}|${wf.steps.map((s) => `${s.status}:${s.retryCount}:${s.backoffUntil || ''}`).join(',')}`;

/**
 * @param {import('../core/state.js').Workflow[]} workflows
 * @param {Set<string>|null} [recentKeys] - idempotency keys of workflows now in recent; skip exit animation for these
 */
export const updateLiveWorkflows = (workflows, recentKeys) => {
    const currentKeys = new Set(workflows.map((w) => w.databaseId));

    // Animate out cards for workflows no longer in inbox
    for (const key of Object.keys(state.previousWorkflows)) {
        if (!currentKeys.has(key)) {
            const card = document.getElementById(`wf-${cssId(key)}`);
            const idemKey = state.previousWorkflows[key]?.idempotencyKey;
            const movedToRecent = idemKey && recentKeys?.has(idemKey);
            if (card && !card.dataset.exiting) {
                const visible = card.offsetParent !== null;
                if (visible && !movedToRecent) {
                    const failed = state.previousWorkflows[key]?.status === 'Failed';
                    if (failed) card.classList.add('exit-fail');
                    card.dataset.exiting = '1';
                    card.style.animation = 'complete-exit 0.5s ease forwards';
                    card.style.pointerEvents = 'none';
                    card.addEventListener(
                        'animationend',
                        () => {
                            card.remove();
                            if (!dom.liveContainer.querySelector('.workflow-card')) {
                                dom.liveEmpty.style.display = 'block';
                            }
                        },
                        { once: true },
                    );
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
        const elId = `wf-${cssId(wf.databaseId)}`;
        let card = document.getElementById(elId);

        const fp = fingerprint(wf);
        if (!card) {
            card = createWorkflowCard(wf, elId);
            dom.liveContainer.appendChild(card);
            state.workflowTimers[wf.databaseId] = {
                startedAt: wf.executionStartedAt || wf.createdAt,
            };
            state.workflowFingerprints[wf.databaseId] = fp;
        } else if (state.workflowFingerprints[wf.databaseId] !== fp) {
            const isCompact = card.classList.contains('compact');
            card.innerHTML = isCompact ? buildCompactCardHTML(wf) : buildCardHTML(wf);
            setCardFilterData(card, wf);
            if (!isCompact) scrollPipelineToActive(card);
            state.workflowFingerprints[wf.databaseId] = fp;
            notifyStepChanged(wf.databaseId);
            notifyWorkflowChanged(wf.databaseId);
        }

        state.previousWorkflows[wf.databaseId] = wf;
    }

    // Only show empty state immediately if no cards exist (including exiting ones)
    const hasCards = dom.liveContainer.querySelector('.workflow-card') !== null;
    const isEmpty = workflows.length === 0 && !hasCards;
    dom.liveEmpty.style.display = isEmpty ? 'block' : 'none';
    _mergeDiscoveredLabels();
    _applyFilter();
};

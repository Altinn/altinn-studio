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
import { notifyChainChanged } from './chain-modal.js';
import { notifyRecentChainsChanged } from './recent.js';

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
const fingerprint = (wf) => {
    const rel = (/** @type {import('../core/state.js').WorkflowRelation[] | undefined} */ rels) =>
        rels?.map((r) => r.status).join('.') ?? '';
    return (
        `${wf.status}|${wf.steps.map((s) => `${s.status}:${s.retryCount}:${s.backoffUntil || ''}`).join(',')}` +
        `|${rel(wf.dependsOn)}|${rel(wf.dependents)}|${rel(wf.links)}`
    );
};

/** Index of the currently-processing step (for scroll-on-change). */
const _processingIdx = /** @type {Record<string, number>} */ ({});

/**
 * @param {import('../core/state.js').Workflow[]} workflows
 * @param {Set<string>|null} [recentKeys] - databaseIds of workflows now in recent; skip exit animation for these
 */
export const updateLiveWorkflows = (workflows, recentKeys) => {
    const currentKeys = new Set(workflows.map((w) => w.databaseId));

    // Animate out cards for workflows no longer in inbox
    for (const key of Object.keys(state.previousWorkflows)) {
        if (!currentKeys.has(key)) {
            const card = document.getElementById(`wf-${cssId(key)}`);
            const movedToRecent = recentKeys?.has(key);
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
            delete _processingIdx[key];
            notifyStepChanged(key);
            notifyWorkflowChanged(key);
            notifyChainChanged(key);
            notifyRecentChainsChanged(key);
        }
    }

    // Add or update active workflow cards
    for (const wf of workflows) {
        const elId = `wf-${cssId(wf.databaseId)}`;
        let card = document.getElementById(elId);

        // Skip if workflow already moved to recent (SSE race condition)
        if (!card && recentKeys?.has(wf.databaseId)) continue;

        const fp = fingerprint(wf);
        if (!card) {
            card = createWorkflowCard(wf, elId);
            dom.liveContainer.appendChild(card);
            state.workflowTimers[wf.databaseId] = {
                startedAt: wf.executionStartedAt || wf.createdAt,
            };
            state.workflowFingerprints[wf.databaseId] = fp;
            // New workflows can extend an open chain view (a fresh transition's Main +
            // side chains are new ids — nothing already rendered changes when they land).
            notifyChainChanged(wf.databaseId);
            notifyRecentChainsChanged(wf.databaseId);
        } else if (state.workflowFingerprints[wf.databaseId] !== fp) {
            const isCompact = card.classList.contains('compact');
            card.innerHTML = isCompact ? buildCompactCardHTML(wf) : buildCardHTML(wf);
            setCardFilterData(card, wf);

            // Sync pulse animations so they don't restart from frame 0 on every innerHTML rebuild
            const phase = performance.now() % 2000;
            card.querySelectorAll('.step-circle.Processing, .status-pill.Processing').forEach(
                (el) => {
                    /** @type {HTMLElement} */ (el).style.animationDelay = `-${phase}ms`;
                },
            );

            // Only scroll the pipeline when the active step actually changes
            if (!isCompact) {
                const curIdx = wf.steps.findIndex(
                    (s) => s.status === 'Processing' || s.status === 'Requeued',
                );
                if (curIdx !== _processingIdx[wf.databaseId]) {
                    _processingIdx[wf.databaseId] = curIdx;
                    scrollPipelineToActive(card);
                }
            }

            state.workflowFingerprints[wf.databaseId] = fp;
            notifyStepChanged(wf.databaseId);
            notifyWorkflowChanged(wf.databaseId);
            notifyChainChanged(wf.databaseId);
            notifyRecentChainsChanged(wf.databaseId);
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

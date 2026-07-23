/* Chain modal — dependency-ordered spine view of a workflow's connected graph.
 * Fetches /dashboard/graph and renders it with the shared chain renderer; rows
 * expand in place to the full pipeline card. */

import { dom, workflowData } from '../core/state.js';
import { esc } from '../core/helpers.js';
import { buildSpineFromEdges, renderChainList } from '../shared/chain.js';

/** Currently open root workflow databaseId (for refresh) */
let _openWfId = '';

/** Currently open root workflow namespace (for refresh) */
let _openWfNamespace = '';

/** Collection of the open root, so newly enqueued members trigger a refresh too */
let _openCollectionKey = '';

/** databaseIds rendered in the open modal, so SSE changes can trigger a refresh */
let _graphIds = new Set();

/** Debounce timer id */
let _refreshTimer = 0;

/**
 * Fetch and render the chain.
 * @param {string} wfId - root workflow databaseId
 * @param {string} wfNamespace
 */
const fetchAndRender = async (wfId, wfNamespace) => {
    try {
        const url = `/dashboard/graph?wf=${encodeURIComponent(wfId)}&ns=${encodeURIComponent(wfNamespace)}`;
        const res = await fetch(url);
        if (_openWfId !== wfId) return; // modal changed while fetching
        if (!res.ok) throw new Error('Workflow graph not found');
        const data = await res.json();
        if (_openWfId !== wfId) return;
        /** @type {import('../core/state.js').Workflow[]} */
        const nodes = data.workflows ?? [];
        _graphIds = new Set(nodes.map((n) => n.databaseId));
        const items = buildSpineFromEdges(nodes, data.edges ?? []);
        dom.chainBody.innerHTML = items.length
            ? renderChainList(items, data.root, { truncated: data.truncated })
            : '<div class="modal-loading">No workflows in graph</div>';
    } catch (err) {
        if (_openWfId !== wfId) return;
        dom.chainBody.innerHTML = `<div class="modal-loading">${esc(/** @type {Error} */ (err).message)}</div>`;
    }
};

/** @param {Event} e @param {string} wfId @param {string} wfNamespace */
window.openChainModal = async (e, wfId, wfNamespace) => {
    e.stopPropagation();
    _openWfId = wfId;
    _openWfNamespace = wfNamespace;
    _openCollectionKey = workflowData[wfId]?.collectionKey || '';
    dom.chainTitle.textContent = _openCollectionKey
        ? `Chain — ${_openCollectionKey}`
        : 'Workflow Chain';
    dom.chainBody.innerHTML = '<div class="modal-loading">Loading...</div>';
    dom.chainModal.classList.add('open');
    await fetchAndRender(wfId, wfNamespace);
};

window.closeChainModal = () => {
    dom.chainModal.classList.remove('open');
    _openWfId = '';
    _openWfNamespace = '';
    _openCollectionKey = '';
    _graphIds = new Set();
};

/**
 * Called by live.js when a workflow appears or its fingerprint changes. Debounced refresh
 * when the workflow is rendered in the open modal, or joins its collection (a new
 * transition's workflows are new ids — the rendered ones never change when that happens).
 * @param {string} wfId
 */
export const notifyChainChanged = (wfId) => {
    if (!_openWfId) return;
    const joinsCollection =
        !!_openCollectionKey && workflowData[wfId]?.collectionKey === _openCollectionKey;
    if (!_graphIds.has(wfId) && !joinsCollection) return;
    clearTimeout(_refreshTimer);
    _refreshTimer = window.setTimeout(() => fetchAndRender(_openWfId, _openWfNamespace), 1000);
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.chainModal.classList.contains('open')) {
        window.closeChainModal();
    }
});

/* Chain modal — dependency-ordered spine view of a workflow's connected graph.
 * Heads render as a vertical spine (topologically sorted over dependency edges);
 * side-chain workflows (isHead === false) indent under the head they link to. */

import { dom, workflowData, parseTransition } from '../core/state.js';
import { esc, formatElapsed } from '../core/helpers.js';
import { revealCard } from '../shared/cards.js';

/** @typedef {import('../core/state.js').Workflow} Workflow */

/** Currently open root workflow databaseId (for refresh) */
let _openWfId = '';

/** Currently open root workflow namespace (for refresh) */
let _openWfNamespace = '';

/** databaseIds rendered in the open modal, so SSE changes can trigger a refresh */
let _graphIds = new Set();

/** Debounce timer id */
let _refreshTimer = 0;

/** @param {Workflow} wf @returns {string} */
const durationHTML = (wf) => {
    const start = wf.executionStartedAt || wf.createdAt;
    const end = wf.updatedAt;
    if (!start || !end) return '';
    const dur = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
    if (dur < 0) return '';
    const label = dur < 1 ? `${(dur * 1000).toFixed(0)}ms` : formatElapsed(dur);
    return `<span class="chain-time">${esc(label)}</span>`;
};

/**
 * A single chain row: name, side-chain badge, step dots, duration, status pill.
 * @param {Workflow} wf @param {boolean} isSide @param {boolean} isRoot
 * @returns {string}
 */
const rowHTML = (wf, isSide, isRoot) => {
    const tx = parseTransition(wf);
    const name = tx ? `${tx.from} → ${tx.to}` : wf.operationId;
    const steps = wf.steps
        .map(
            (s) =>
                `<span class="compact-dot rel-dot ${esc(s.status)}" title="${esc(s.commandDetail)} (${esc(s.status)})"></span>`,
        )
        .join('');
    const badge = isSide
        ? `<span class="side-chain-badge" title="Invisible to collection head tracking (IsHead=false): never gates dependents or the collection frontier">side chain</span>`
        : '';
    return (
        `<div class="chain-node${isSide ? ' chain-side' : ''}${isRoot ? ' chain-root' : ''}"` +
        ` onclick="chainRowClick('${esc(wf.databaseId)}')" title="${esc(wf.operationId)} — click to jump to card">` +
        `<span class="chain-name">${esc(name)}</span>${badge}` +
        `<span class="chain-steps">${steps}</span>` +
        `<span class="header-spacer"></span>` +
        durationHTML(wf) +
        `<span class="status-pill ${esc(wf.status)}" style="animation:none">${esc(wf.status)}</span>` +
        `</div>`
    );
};

/**
 * Lay out the graph as a spine of heads with side chains attached beneath them.
 * @param {{ root: string, workflows: Workflow[], edges: { from: string, to: string, kind: string }[] }} data
 * @returns {string}
 */
const buildChainHTML = (data) => {
    const nodes = data.workflows ?? [];
    const edges = data.edges ?? [];
    if (!nodes.length) return '<div class="modal-loading">No workflows in graph</div>';

    const byId = new Map(nodes.map((n) => [n.databaseId, n]));
    const headIds = new Set(nodes.filter((n) => n.isHead !== false).map((n) => n.databaseId));

    // Kahn topological sort of the head spine over dependency edges, createdAt tiebreak.
    const indeg = new Map([...headIds].map((id) => [id, 0]));
    /** @type {Map<string, string[]>} */
    const out = new Map();
    for (const e of edges) {
        if (e.kind !== 'dependency' || !headIds.has(e.from) || !headIds.has(e.to)) continue;
        out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
        indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    }
    const byCreated = (/** @type {string} */ a, /** @type {string} */ b) =>
        String(byId.get(a)?.createdAt).localeCompare(String(byId.get(b)?.createdAt));
    const ready = [...headIds].filter((id) => indeg.get(id) === 0).sort(byCreated);
    /** @type {string[]} */
    const spine = [];
    while (ready.length) {
        const id = /** @type {string} */ (ready.shift());
        spine.push(id);
        for (const next of out.get(id) ?? []) {
            const d = /** @type {number} */ (indeg.get(next)) - 1;
            indeg.set(next, d);
            if (d === 0) {
                ready.push(next);
                ready.sort(byCreated); // graphs are small; clarity over asymptotics
            }
        }
    }
    // Cycle guard — anything the sort missed still renders, appended in creation order.
    const emitted = new Set(spine);
    spine.push(...[...headIds].filter((id) => !emitted.has(id)).sort(byCreated));

    // Attach each side chain under the first head it shares any edge with.
    /** @type {Map<string, Workflow[]>} */
    const attached = new Map();
    /** @type {Workflow[]} */
    const orphans = [];
    for (const node of nodes) {
        if (node.isHead !== false) continue;
        const edge = edges.find(
            (e) =>
                (e.from === node.databaseId && headIds.has(e.to)) ||
                (e.to === node.databaseId && headIds.has(e.from)),
        );
        const headId = edge ? (headIds.has(edge.from) ? edge.from : edge.to) : null;
        if (headId) attached.set(headId, [...(attached.get(headId) ?? []), node]);
        else orphans.push(node);
    }
    const byNodeCreated = (/** @type {Workflow} */ a, /** @type {Workflow} */ b) =>
        String(a.createdAt).localeCompare(String(b.createdAt));

    let html = '<div class="chain-list">';
    for (const id of spine) {
        const head = byId.get(id);
        if (!head) continue;
        html += rowHTML(head, false, id === data.root);
        for (const side of (attached.get(id) ?? []).sort(byNodeCreated)) {
            html += rowHTML(side, true, side.databaseId === data.root);
        }
    }
    for (const side of orphans.sort(byNodeCreated)) {
        html += rowHTML(side, true, side.databaseId === data.root);
    }
    html += '</div>';
    return html;
};

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
        _graphIds = new Set((data.workflows ?? []).map((/** @type {Workflow} */ n) => n.databaseId));
        dom.chainBody.innerHTML = buildChainHTML(data);
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
    const collectionKey = workflowData[wfId]?.collectionKey;
    dom.chainTitle.textContent = collectionKey ? `Chain — ${collectionKey}` : 'Workflow Chain';
    dom.chainBody.innerHTML = '<div class="modal-loading">Loading...</div>';
    dom.chainModal.classList.add('open');
    await fetchAndRender(wfId, wfNamespace);
};

window.closeChainModal = () => {
    dom.chainModal.classList.remove('open');
    _openWfId = '';
    _openWfNamespace = '';
    _graphIds = new Set();
};

/** Close the modal and jump to the clicked workflow's card when it is on screen. */
window.chainRowClick = (/** @type {string} */ wfId) => {
    window.closeChainModal();
    revealCard(wfId);
};

/** Called by live.js when a workflow fingerprint changes. Debounced refresh. */
export const notifyChainChanged = (/** @type {string} */ wfId) => {
    if (!_openWfId || !_graphIds.has(wfId)) return;
    clearTimeout(_refreshTimer);
    _refreshTimer = window.setTimeout(() => fetchAndRender(_openWfId, _openWfNamespace), 1000);
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.chainModal.classList.contains('open')) {
        window.closeChainModal();
    }
});

/* Chain rows — dependency-ordered spine rendering shared by the chain modal and the
 * grouped Recent view. Heads (isHead !== false) form a vertical spine; side-chain
 * workflows (isHead === false) indent under the head they belong to. Rows expand in
 * place to the full pipeline card. */

import { state, workflowData, parseTransition } from '../core/state.js';
import { esc, formatElapsed } from '../core/helpers.js';
import { buildCardHTML, setCardFilterData } from './cards.js';

/** @typedef {import('../core/state.js').Workflow} Workflow */
/** @typedef {{ from: string, to: string, kind: string }} ChainEdge */
/** @typedef {{ wf: Workflow, isSide: boolean }} ChainItem */

const TERMINAL_STATUSES = new Set([
    'Completed',
    'Failed',
    'Canceled',
    'Abandoned',
    'DependencyFailed',
]);

/** databaseIds of chain rows currently expanded to full cards (survives re-renders). */
const expandedRows = new Set();

/** Prefer the freshest copy of a workflow: the live section's SSE object wins. */
const freshest = (/** @type {Workflow} */ wf) => state.previousWorkflows[wf.databaseId] ?? wf;

/**
 * Duration label for a chain row. Terminal workflows show their real duration; active
 * workflows tick via the shared timer loop when the live section registered a timer.
 * @param {Workflow} wf @returns {string}
 */
const durationHTML = (wf) => {
    if (!TERMINAL_STATUSES.has(wf.status)) {
        return state.workflowTimers[wf.databaseId]
            ? `<span class="chain-time" data-timer="${esc(wf.databaseId)}"></span>`
            : '';
    }
    const start = wf.executionStartedAt || wf.createdAt;
    const end = wf.removedAt || wf.steps.at(-1)?.updatedAt || wf.updatedAt;
    if (!start || !end) return '';
    const dur = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
    if (dur < 0) return '';
    const label = dur < 1 ? `${(dur * 1000).toFixed(0)}ms` : formatElapsed(dur);
    return `<span class="chain-time">${esc(label)}</span>`;
};

/**
 * Inner content of a collapsed chain row: name, side-chain badge, clickable step dots,
 * duration, status pill.
 * @param {Workflow} wf @returns {string}
 */
const rowInnerHTML = (wf) => {
    const tx = parseTransition(wf);
    const name = tx ? `${tx.from} → ${tx.to}` : wf.operationId;
    const steps = wf.steps
        .map(
            (s) =>
                `<span class="compact-dot rel-dot ${esc(s.status)}"` +
                ` onclick="event.stopPropagation();openStepModal('${esc(wf.databaseId)}','${esc(wf.namespace)}','${esc(s.idempotencyKey)}','${esc(s.commandDetail)}')"` +
                ` title="${esc(s.commandDetail)} (${esc(s.status)})"></span>`,
        )
        .join('');
    const badge =
        wf.isHead === false
            ? `<span class="side-chain-badge" title="Invisible to collection head tracking (IsHead=false): never gates dependents or the collection frontier">side chain</span>`
            : '';
    return (
        `<span class="chain-name" title="${esc(wf.operationId)}">${esc(name)}</span>${badge}` +
        `<span class="chain-steps">${steps}</span>` +
        `<span class="header-spacer"></span>` +
        durationHTML(wf) +
        `<span class="status-pill ${esc(wf.status)}" style="animation:none">${esc(wf.status)}</span>`
    );
};

/**
 * Inner content of an expanded chain row: the full pipeline card, in place.
 * @param {Workflow} wf @returns {string}
 */
const expandedInnerHTML = (wf) =>
    `<div class="workflow-card${wf.isHead === false ? ' side-chain' : ''}" data-wfkey="${esc(wf.databaseId)}">${buildCardHTML(wf, true)}</div>`;

/**
 * A full chain node (row or expanded card), wrapped for spine layout and click handling.
 * @param {Workflow} wf @param {boolean} isSide @param {boolean} isRoot
 * @returns {string}
 */
const nodeHTML = (wf, isSide, isRoot) => {
    const expanded = expandedRows.has(wf.databaseId);
    const cls =
        `chain-node${isSide ? ' chain-side' : ''}${isRoot ? ' chain-root' : ''}` +
        (expanded ? ' chain-expanded' : '');
    const hint = expanded ? 'click to collapse' : 'click to expand';
    return (
        `<div class="${cls}" data-chainwf="${esc(wf.databaseId)}"` +
        ` onclick="chainRowToggle(event,'${esc(wf.databaseId)}')" title="${esc(wf.operationId)} — ${hint}">` +
        (expanded ? expandedInnerHTML(wf) : rowInnerHTML(wf)) +
        `</div>`
    );
};

/**
 * Render an ordered chain as HTML, registering each workflow in the shared store so
 * row interactions (expand, step modal) can resolve it later.
 * @param {ChainItem[]} items @param {string} [rootId] - workflow to mark with the cyan spine dot
 * @returns {string}
 */
export const renderChainList = (items, rootId = '') => {
    let html = '<div class="chain-list">';
    for (const item of items) {
        const wf = freshest(item.wf);
        if (!state.previousWorkflows[wf.databaseId]) workflowData[wf.databaseId] = wf;
        html += nodeHTML(wf, item.isSide, wf.databaseId === rootId);
    }
    html += '</div>';
    return html;
};

/**
 * Lay out a fetched graph as a spine of heads with side chains attached beneath them.
 * Heads are topologically sorted over `dependency` edges (Kahn, createdAt tiebreak, cycle
 * guard); each side chain attaches under the head it links to (link edges preferred —
 * side-effects workflows carry a link to their producer Main — falling back to any edge).
 * @param {Workflow[]} nodes @param {ChainEdge[]} edges
 * @returns {ChainItem[]}
 */
export const buildSpineFromEdges = (nodes, edges) => {
    const byId = new Map(nodes.map((n) => [n.databaseId, n]));
    const headIds = new Set(nodes.filter((n) => n.isHead !== false).map((n) => n.databaseId));

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

    /** @type {Map<string, Workflow[]>} */
    const attached = new Map();
    /** @type {Workflow[]} */
    const orphans = [];
    for (const node of nodes) {
        if (node.isHead !== false) continue;
        const touching = edges.filter(
            (e) =>
                (e.from === node.databaseId && headIds.has(e.to)) ||
                (e.to === node.databaseId && headIds.has(e.from)),
        );
        const edge = touching.find((e) => e.kind === 'link') ?? touching[0];
        const headId = edge ? (headIds.has(edge.from) ? edge.from : edge.to) : null;
        if (headId) attached.set(headId, [...(attached.get(headId) ?? []), node]);
        else orphans.push(node);
    }
    const byNodeCreated = (/** @type {Workflow} */ a, /** @type {Workflow} */ b) =>
        String(a.createdAt).localeCompare(String(b.createdAt));

    /** @type {ChainItem[]} */
    const items = [];
    for (const id of spine) {
        const head = byId.get(id);
        if (!head) continue;
        items.push({ wf: head, isSide: false });
        for (const side of (attached.get(id) ?? []).sort(byNodeCreated)) {
            items.push({ wf: side, isSide: true });
        }
    }
    for (const side of orphans.sort(byNodeCreated)) items.push({ wf: side, isSide: true });
    return items;
};

/**
 * Lay out a set of workflows as a spine using creation times alone — no edges needed.
 * Heads render in creation order; each side chain attaches under the latest head created
 * no more than 1s after it. Side chains are either enqueued while their producer head
 * executes (created after it, and always before the next head — heads gate the following
 * transition) or land in the same batch as their head, where insert order can put them a
 * few ms before it; the tolerance absorbs that jitter without ever reaching the next
 * head, which is a later transition away.
 * @param {Workflow[]} nodes
 * @returns {ChainItem[]}
 */
export const buildSpineByCreation = (nodes) => {
    const byNodeCreated = (/** @type {Workflow} */ a, /** @type {Workflow} */ b) =>
        String(a.createdAt).localeCompare(String(b.createdAt));
    const sorted = [...nodes].sort(byNodeCreated);
    const heads = sorted.filter((n) => n.isHead !== false);
    const sides = sorted.filter((n) => n.isHead === false);
    if (!heads.length) return sides.map((wf) => ({ wf, isSide: true }));

    const t = (/** @type {Workflow} */ n) => new Date(n.createdAt).getTime();
    /** @type {Map<string, Workflow[]>} */
    const attached = new Map(heads.map((h) => [h.databaseId, []]));
    for (const side of sides) {
        let target = heads[0];
        for (const head of heads) {
            if (t(head) <= t(side) + 1000) target = head;
            else break;
        }
        /** @type {Workflow[]} */ (attached.get(target.databaseId)).push(side);
    }
    /** @type {ChainItem[]} */
    const items = [];
    for (const head of heads) {
        items.push({ wf: head, isSide: false });
        for (const side of /** @type {Workflow[]} */ (attached.get(head.databaseId))) {
            items.push({ wf: side, isSide: true });
        }
    }
    return items;
};

/**
 * Toggle a chain row between the compact row and the full pipeline card, in place.
 * Interactive elements inside the row/card keep their own behavior.
 * @param {Event} e @param {string} wfId
 */
window.chainRowToggle = (e, wfId) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (
        target.closest(
            '.seg, .compact-dot, .step-circle, .open-btn, a, button, .pipeline, .compact-pipeline',
        )
    )
        return;
    const node = /** @type {HTMLElement | null} */ (target.closest('.chain-node'));
    const wf = workflowData[wfId];
    if (!node || !wf) return;

    if (expandedRows.has(wfId)) {
        expandedRows.delete(wfId);
        node.classList.remove('chain-expanded');
        node.innerHTML = rowInnerHTML(freshest(wf));
        node.title = `${wf.operationId} — click to expand`;
    } else {
        expandedRows.add(wfId);
        node.classList.add('chain-expanded');
        const fresh = freshest(wf);
        node.innerHTML = expandedInnerHTML(fresh);
        node.title = '';
        const card = /** @type {HTMLElement | null} */ (node.querySelector('.workflow-card'));
        if (card) setCardFilterData(card, fresh);
        // Recent/graph workflows don't carry relations inline - fetch on first expand
        // (re-renders the card when the response lands).
        if (fresh.dependsOn === undefined) window.loadRelations(null, wfId);
    }
};

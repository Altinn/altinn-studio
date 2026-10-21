/* Chain rows — dependency-ordered spine rendering shared by the chain modal and the
 * grouped Recent view. Primary workflows form a vertical spine; auxiliary workflows
 * (isHead === false) indent under the primary workflow they belong to. Rows expand in
 * place to the full pipeline card. */

import { state, workflowData, parseTransition } from '../core/state.js';
import { esc, escAttr, escJsArg, formatElapsed, isAuxiliaryWorkflow } from '../core/helpers.js';
import {
    auxiliaryBadgeHTML,
    buildCardHTML,
    revealCard,
    revealFirstVisible,
    setCardFilterData,
} from './cards.js';

/** @typedef {import('../core/state.js').Workflow} Workflow */
/** @typedef {{ from: string, to: string, kind: string }} ChainEdge */
/** @typedef {{ wf: Workflow, isAuxiliary: boolean }} ChainItem */

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
 * workflows tick via the shared timer loop when the live section holds the workflow.
 * @param {Workflow} wf @returns {string}
 */
const durationHTML = (wf) => {
    if (!TERMINAL_STATUSES.has(wf.status)) {
        return state.previousWorkflows[wf.databaseId]
            ? `<span class="chain-time" data-timer="${escAttr(wf.databaseId)}"></span>`
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
 * Inner content of a collapsed chain row: name, auxiliary badge, clickable step dots,
 * duration, status pill.
 * @param {Workflow} wf @returns {string}
 */
const rowInnerHTML = (wf) => {
    const tx = parseTransition(wf);
    const name = tx ? `${tx.from} → ${tx.to}` : wf.operationId;
    const steps = wf.steps
        .map(
            (s) =>
                `<span class="compact-dot rel-dot ${escAttr(s.status)}"` +
                ` onclick="event.stopPropagation();openStepModal('${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}','${escJsArg(s.idempotencyKey)}','${escJsArg(s.commandDetail)}')"` +
                ` title="${escAttr(s.commandDetail)} (${escAttr(s.status)})"></span>`,
        )
        .join('');
    return (
        `<span class="chain-name" title="${escAttr(wf.operationId)}">${esc(name)}</span>${auxiliaryBadgeHTML(wf)}` +
        `<span class="chain-steps">${steps}</span>` +
        `<span class="header-spacer"></span>` +
        durationHTML(wf) +
        `<span class="status-pill ${escAttr(wf.status)}" style="animation:none">${esc(wf.status)}</span>`
    );
};

/**
 * Inner content of an expanded chain row: the full pipeline card, in place.
 * @param {Workflow} wf @returns {string}
 */
const expandedInnerHTML = (wf) =>
    `<div class="workflow-card${isAuxiliaryWorkflow(wf) ? ' auxiliary' : ''}" data-wfkey="${escAttr(wf.databaseId)}">${buildCardHTML(wf, true)}</div>`;

/**
 * A full chain node (row or expanded card), wrapped for spine layout and click handling.
 * @param {Workflow} wf @param {boolean} isAuxiliary @param {boolean} isRoot
 * @returns {string}
 */
const nodeHTML = (wf, isAuxiliary, isRoot) => {
    const expanded = expandedRows.has(wf.databaseId);
    const cls =
        `chain-node${isAuxiliary ? ' chain-auxiliary' : ''}${isRoot ? ' chain-root' : ''}` +
        (expanded ? ' chain-expanded' : '');
    const hint = expanded ? 'click to collapse' : 'click to expand';
    return (
        `<div class="${cls}" data-chainwf="${escAttr(wf.databaseId)}"` +
        ` onclick="chainRowToggle(event,'${escJsArg(wf.databaseId)}')" title="${escAttr(wf.operationId)} — ${hint}">` +
        (expanded ? expandedInnerHTML(wf) : rowInnerHTML(wf)) +
        `</div>`
    );
};

/**
 * Scroll to and flash a workflow's collapsed chain row, falling back to `revealCard`.
 * @param {string} wfId
 * @returns {boolean} true when something was revealed
 */
export const revealChainRow = (wfId) =>
    revealFirstVisible(`[data-chainwf="${CSS.escape(wfId)}"]`) || revealCard(wfId);

/** Gaps between transitions shorter than this are noise, not story. */
const GAP_THRESHOLD_MS = 1000;

/** Wall-clock end of a terminal workflow, NaN while it is still running. @param {Workflow} wf */
const wallClockEnd = (wf) =>
    TERMINAL_STATUSES.has(wf.status)
        ? new Date(
              wf.removedAt || wf.steps.at(-1)?.updatedAt || wf.updatedAt || wf.createdAt,
          ).getTime()
        : NaN;

/**
 * Render an ordered chain as HTML, registering each workflow in the shared store so
 * row interactions (expand, step modal) can resolve it later. Wall-clock gaps between
 * consecutive primary workflows render as dividers — that is where the time went between the
 * engine's transitions (e.g. the user working in the task).
 * @param {ChainItem[]} items
 * @param {string} [rootId] - workflow to mark with the cyan spine dot
 * @param {{ truncated?: boolean }} [opts] - truncated: the graph has an older, unshown tail
 * @returns {string}
 */
export const renderChainList = (items, rootId = '', opts) => {
    let html = '<div class="chain-list">';
    if (opts?.truncated) {
        html += `<div class="chain-truncated" title="The connected graph exceeds the node cap; only the most recent workflows are shown">&#8943; earlier workflows not shown</div>`;
    }
    let prevPrimaryEnd = NaN;
    for (const item of items) {
        // Registering the freshest copy (live SSE object when present) can never go stale,
        // and guarantees row interactions resolve regardless of which surface rendered first.
        const wf = freshest(item.wf);
        workflowData[wf.databaseId] = wf;
        if (!item.isAuxiliary) {
            const gap = new Date(wf.createdAt).getTime() - prevPrimaryEnd;
            if (gap > GAP_THRESHOLD_MS) {
                html += `<div class="chain-gap" title="Wall-clock gap before this transition was enqueued">+&thinsp;${esc(formatElapsed(gap / 1000))}</div>`;
            }
            prevPrimaryEnd = wallClockEnd(wf);
        }
        html += nodeHTML(wf, item.isAuxiliary, wf.databaseId === rootId);
    }
    html += '</div>';
    return html;
};

/**
 * Lay out a fetched graph as a spine of primary workflows with auxiliary workflows attached
 * beneath them. Primary workflows are topologically sorted over `dependency` edges (Kahn,
 * createdAt tiebreak, cycle guard); each auxiliary workflow attaches under the primary workflow
 * it links to (link edges preferred — a process-next auxiliary workflow carries a link to the
 * primary workflow that enqueued it — falling back to any edge).
 * @param {Workflow[]} nodes @param {ChainEdge[]} edges
 * @returns {ChainItem[]}
 */
export const buildSpineFromEdges = (nodes, edges) => {
    const byId = new Map(nodes.map((n) => [n.databaseId, n]));
    const primaryIds = new Set(
        nodes.filter((n) => !isAuxiliaryWorkflow(n)).map((n) => n.databaseId),
    );

    const indeg = new Map([...primaryIds].map((id) => [id, 0]));
    /** @type {Map<string, string[]>} */
    const out = new Map();
    for (const e of edges) {
        if (e.kind !== 'dependency' || !primaryIds.has(e.from) || !primaryIds.has(e.to)) continue;
        out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
        indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    }
    const byCreated = (/** @type {string} */ a, /** @type {string} */ b) =>
        String(byId.get(a)?.createdAt).localeCompare(String(byId.get(b)?.createdAt));
    const ready = [...primaryIds].filter((id) => indeg.get(id) === 0).sort(byCreated);
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
    spine.push(...[...primaryIds].filter((id) => !emitted.has(id)).sort(byCreated));

    /** @type {Map<string, Workflow[]>} */
    const attached = new Map();
    /** @type {Workflow[]} */
    const orphans = [];
    for (const node of nodes) {
        if (!isAuxiliaryWorkflow(node)) continue;
        const touching = edges.filter(
            (e) =>
                (e.from === node.databaseId && primaryIds.has(e.to)) ||
                (e.to === node.databaseId && primaryIds.has(e.from)),
        );
        const edge = touching.find((e) => e.kind === 'link') ?? touching[0];
        const primaryId = edge ? (primaryIds.has(edge.from) ? edge.from : edge.to) : null;
        if (primaryId) attached.set(primaryId, [...(attached.get(primaryId) ?? []), node]);
        else orphans.push(node);
    }
    const byNodeCreated = (/** @type {Workflow} */ a, /** @type {Workflow} */ b) =>
        String(a.createdAt).localeCompare(String(b.createdAt));

    /** @type {ChainItem[]} */
    const items = [];
    for (const id of spine) {
        const primary = byId.get(id);
        if (!primary) continue;
        items.push({ wf: primary, isAuxiliary: false });
        for (const aux of (attached.get(id) ?? []).sort(byNodeCreated)) {
            items.push({ wf: aux, isAuxiliary: true });
        }
    }
    for (const aux of orphans.sort(byNodeCreated)) items.push({ wf: aux, isAuxiliary: true });
    return items;
};

/**
 * Lay out a set of workflows as a spine using creation times alone — no edges needed.
 * Primary workflows render in creation order; each auxiliary workflow attaches under the latest
 * primary workflow created no more than 1s after it. An auxiliary workflow is either enqueued
 * while the primary workflow that produced it executes (created after it, and always before the
 * next primary workflow — primary workflows gate the following transition) or lands in the same
 * batch as it, where insert order can put it a few ms before; the tolerance absorbs that jitter
 * without ever reaching the next primary workflow, which is a later transition away.
 * @param {Workflow[]} nodes
 * @returns {ChainItem[]}
 */
export const buildSpineByCreation = (nodes) => {
    const byNodeCreated = (/** @type {Workflow} */ a, /** @type {Workflow} */ b) =>
        String(a.createdAt).localeCompare(String(b.createdAt));
    const sorted = [...nodes].sort(byNodeCreated);
    const primaries = sorted.filter((n) => !isAuxiliaryWorkflow(n));
    const auxiliaries = sorted.filter(isAuxiliaryWorkflow);
    if (!primaries.length) return auxiliaries.map((wf) => ({ wf, isAuxiliary: true }));

    const t = (/** @type {Workflow} */ n) => new Date(n.createdAt).getTime();
    /** @type {Map<string, Workflow[]>} */
    const attached = new Map(primaries.map((p) => [p.databaseId, []]));
    for (const aux of auxiliaries) {
        let target = primaries[0];
        for (const primary of primaries) {
            if (t(primary) <= t(aux) + 1000) target = primary;
            else break;
        }
        /** @type {Workflow[]} */ (attached.get(target.databaseId)).push(aux);
    }
    /** @type {ChainItem[]} */
    const items = [];
    for (const primary of primaries) {
        items.push({ wf: primary, isAuxiliary: false });
        for (const aux of /** @type {Workflow[]} */ (attached.get(primary.databaseId))) {
            items.push({ wf: aux, isAuxiliary: true });
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

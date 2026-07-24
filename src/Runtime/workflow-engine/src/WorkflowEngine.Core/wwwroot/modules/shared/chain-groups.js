/* Collection groups — the group chrome around shared chain rows, used by the Recent
 * section's Chains view and the Query tab's chains mode. Owns the per-collection
 * full-graph history cache and the history control. */

import { state, workflowData } from '../core/state.js';
import { esc, escJsArg, formatElapsed } from '../core/helpers.js';
import {
    buildFilterText,
    buildLabelsHTML,
    buildStatusTags,
    collectionButtonHTML,
} from './cards.js';
import { buildSpineByCreation, buildSpineFromEdges, renderChainList } from './chain.js';

/** @typedef {import('../core/state.js').Workflow} Workflow */

/**
 * Full-graph cache per collectionKey, populated by the per-group history control.
 * Shared across surfaces: history loaded from Recent is instantly available in Query.
 * @type {Map<string, { nodes: Workflow[], edges: { from: string, to: string, kind: string }[], truncated: boolean }>}
 */
const historyCache = new Map();

/** collectionKeys with a history refetch in flight (avoids refetch storms) */
const historyRefreshing = new Set();

/** Re-render callbacks, one per chains surface, invoked when a history graph (re)loads. */
const rerenderHooks = new Set();

/** @param {() => void} fn */
export const onChainGroupsChanged = (fn) => {
    rerenderHooks.add(fn);
};

const TERMINAL_STATUSES = new Set([
    'Completed',
    'Failed',
    'Canceled',
    'Abandoned',
    'DependencyFailed',
]);

/**
 * Aggregate status for a group header: an in-flight member wins (the story is still
 * running), then the worst terminal outcome, then Completed.
 * @param {Workflow[]} members @returns {string}
 */
const aggregateStatus = (members) => {
    const statuses = new Set(members.map((m) => m.status));
    for (const s of ['Processing', 'Requeued', 'Enqueued']) if (statuses.has(s)) return s;
    for (const s of ['Failed', 'DependencyFailed', 'Canceled', 'Abandoned'])
        if (statuses.has(s)) return s;
    return 'Completed';
};

/** Wall-clock span of the group: first enqueue → last write. @param {Workflow[]} members */
const spanHTML = (members) => {
    const starts = members.map((m) => new Date(m.createdAt).getTime());
    const ends = members.map((m) =>
        new Date(m.removedAt || m.steps.at(-1)?.updatedAt || m.updatedAt || m.createdAt).getTime(),
    );
    const span = (Math.max(...ends) - Math.min(...starts)) / 1000;
    if (!Number.isFinite(span) || span < 0) return '';
    const label = span < 1 ? `${(span * 1000).toFixed(0)}ms` : formatElapsed(span);
    return `<span class="chain-time" title="First enqueue → last update">${esc(label)}</span>`;
};

/**
 * @param {number} count - members this surface contributed
 * @param {number} total - rows rendered (history graph can exceed the members)
 * @param {string} countNoun - 'workflows' for exhaustive surfaces, 'matching' for filtered ones
 * @returns {string}
 */
const countLabel = (count, total, countNoun) => {
    const noun = countNoun === 'workflows' && count === 1 ? 'workflow' : countNoun;
    return total > count ? `${count} ${noun} of ${total}` : `${count} ${noun}`;
};

/**
 * @param {string} key - collectionKey
 * @param {Workflow[]} members - createdAt-ordered group members
 * @param {{ total: number, hasHistory: boolean, countNoun: string }} opts
 * @returns {string}
 */
const groupHeaderHTML = (key, members, opts) => {
    const head = members.find((m) => m.isHead !== false) ?? members[0];
    let html = '<div class="chain-group-header">';
    html += buildLabelsHTML(head, true);
    html += '<span class="header-spacer"></span>';
    html += `<span class="chain-count">${countLabel(members.length, opts.total, opts.countNoun)}</span>`;
    html += spanHTML(members);
    const agg = aggregateStatus(members);
    html += `<span class="status-pill ${esc(agg)}" style="animation:none">${esc(agg)}</span>`;
    html += collectionButtonHTML(head, true);
    html += opts.hasHistory
        ? `<span class="chain-history-loaded" title="Showing the full workflow graph for this collection">full history</span>`
        : `<a class="open-btn chain-history-btn" onclick="loadChainHistory(event,'${escJsArg(key)}','${escJsArg(head.databaseId)}','${escJsArg(head.namespace)}')" title="Load the full workflow graph for this collection (beyond the current window)">&#10227; history</a>`;
    html += '</div>';
    return html;
};

/**
 * Build one collection group: header + spine. Uses the cached full graph when loaded
 * (auto-refreshing it when new members have appeared since the fetch), otherwise the
 * creation-order heuristic over the given members.
 * @param {string} key
 * @param {Workflow[]} members
 * @param {{ countNoun?: string }} [opts] - countNoun: 'workflows' (default) when members are
 *   exhaustive for the surface, 'matching' when they are a filtered subset (query results)
 * @returns {HTMLElement}
 */
export const buildGroupEl = (key, members, opts) => {
    const countNoun = opts?.countNoun ?? 'workflows';
    members.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

    const hist = historyCache.get(key);
    let items;
    let total = members.length;
    if (hist) {
        const merged = new Map(hist.nodes.map((n) => [n.databaseId, n]));
        let missing = false;
        for (const m of members) {
            if (!merged.has(m.databaseId)) {
                missing = true;
                merged.set(m.databaseId, m);
            }
        }
        total = merged.size;
        items = buildSpineFromEdges([...merged.values()], hist.edges);
        // New members mean new edges the cache doesn't know about — refetch in the background.
        if (missing && !historyRefreshing.has(key)) {
            historyRefreshing.add(key);
            const head = /** @type {Workflow} */ (members.at(-1));
            window
                .loadChainHistory(null, key, head.databaseId, head.namespace)
                .finally(() => historyRefreshing.delete(key));
        }
    } else {
        items = buildSpineByCreation(members);
    }

    const el = document.createElement('div');
    el.className = 'chain-group';
    el.dataset.collectionkey = key.toLowerCase();
    el.dataset.namespace = members[0].namespace.toLowerCase();
    el.dataset.filter = members.map(buildFilterText).join(' ');
    el.dataset.status = [...new Set(members.flatMap((m) => buildStatusTags(m).split(' ')))].join(
        ' ',
    );
    const labels = new Set();
    for (const m of members) {
        for (const [k, v] of Object.entries(m.labels ?? {})) labels.add(`${k}:${v}`.toLowerCase());
    }
    if (labels.size) el.dataset.labels = [...labels].join(',');
    el.innerHTML =
        groupHeaderHTML(key, members, { total, hasHistory: !!hist, countNoun }) +
        renderChainList(items, '', { truncated: hist?.truncated });
    for (const m of members) {
        workflowData[m.databaseId] = state.previousWorkflows[m.databaseId] ?? m;
    }
    return el;
};

/**
 * Fetch the full connected graph for a collection and re-render every chains surface.
 * @param {Event | null} e @param {string} key @param {string} wfId @param {string} ns
 */
window.loadChainHistory = async (e, key, wfId, ns) => {
    e?.stopPropagation();
    try {
        const res = await fetch(
            `/dashboard/graph?wf=${encodeURIComponent(wfId)}&ns=${encodeURIComponent(ns)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        historyCache.set(key, {
            nodes: data.workflows ?? [],
            edges: data.edges ?? [],
            truncated: !!data.truncated,
        });
    } catch {
        return;
    }
    for (const fn of rerenderHooks) fn();
};

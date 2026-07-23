/* Recent workflows — flat card modes plus the collection-grouped "Chains" view.
 *
 * Chains mode groups the recent window by collectionKey and renders each group as a
 * dependency-ordered spine (shared chain renderer): the story of the collection, oldest
 * transition first, side chains indented under the head that produced them. In-flight
 * workflows of a rendered collection are merged in so the story includes "now". A
 * per-group history control fetches /dashboard/graph for the exact edge-based spine
 * beyond the recent SSE window. */

import { dom, state, workflowData } from '../core/state.js';
import { cssId, esc, formatElapsed } from '../core/helpers.js';
import {
    buildCardHTML,
    buildCompactCardHTML,
    buildFilterText,
    buildLabelsHTML,
    buildStatusTags,
    collectionButtonHTML,
    setCardFilterData,
} from '../shared/cards.js';
import { buildSpineByCreation, buildSpineFromEdges, renderChainList } from '../shared/chain.js';

/** @typedef {import('../core/state.js').Workflow} Workflow */

/** Late-bound references */
/** @type {() => void} */
let _mergeDiscoveredLabels = () => {};
/** @type {() => void} */
let _applyFilter = () => {};
/** @type {() => void} */
let _syncUrl = () => {};

/** @param {{ mergeDiscoveredLabels: () => void, applyFilter: () => void, syncUrl: () => void }} fns */
export const bindRecentCallbacks = (fns) => {
    _mergeDiscoveredLabels = fns.mergeDiscoveredLabels;
    _applyFilter = fns.applyFilter;
    _syncUrl = fns.syncUrl;
};

/* ── Chains view ─────────────────────────────────────────── */

/**
 * Full-graph cache per collectionKey, populated by the per-group history control.
 * @type {Map<string, { nodes: Workflow[], edges: { from: string, to: string, kind: string }[] }>}
 */
const historyCache = new Map();

/** collectionKeys with a history refetch in flight (avoids refetch storms) */
const historyRefreshing = new Set();

/** Debounce timer for live-driven group re-renders */
let _liveNotifyTimer = 0;

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
        new Date(
            m.removedAt || m.steps.at(-1)?.updatedAt || m.updatedAt || m.createdAt,
        ).getTime(),
    );
    const span = (Math.max(...ends) - Math.min(...starts)) / 1000;
    if (!Number.isFinite(span) || span < 0) return '';
    const label = span < 1 ? `${(span * 1000).toFixed(0)}ms` : formatElapsed(span);
    return `<span class="chain-time" title="First enqueue → last update">${esc(label)}</span>`;
};

/**
 * @param {string} key - collectionKey
 * @param {Workflow[]} members - createdAt-ordered group members
 * @param {boolean} hasHistory - full graph already loaded
 * @returns {string}
 */
const groupHeaderHTML = (key, members, hasHistory) => {
    const head = members.find((m) => m.isHead !== false) ?? members[0];
    let html = '<div class="chain-group-header">';
    html += buildLabelsHTML(head, true);
    html += '<span class="header-spacer"></span>';
    html += `<span class="chain-count">${members.length} workflow${members.length === 1 ? '' : 's'}</span>`;
    html += spanHTML(members);
    const agg = aggregateStatus(members);
    html += `<span class="status-pill ${esc(agg)}" style="animation:none">${esc(agg)}</span>`;
    html += collectionButtonHTML(head, true);
    html += hasHistory
        ? `<span class="chain-history-loaded" title="Showing the full workflow graph for this collection">full history</span>`
        : `<a class="open-btn chain-history-btn" onclick="loadChainHistory(event,'${esc(key)}','${esc(head.databaseId)}','${esc(head.namespace)}')" title="Load the full workflow graph for this collection (beyond the recent window)">&#10227; history</a>`;
    html += '</div>';
    return html;
};

/**
 * Build one collection group: header + spine. Uses the cached full graph when loaded
 * (auto-refreshing it when new members have appeared since the fetch), otherwise the
 * creation-order heuristic over the members in the recent window.
 * @param {string} key @param {Workflow[]} members
 * @returns {HTMLElement}
 */
const buildGroupEl = (key, members) => {
    members.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

    const hist = historyCache.get(key);
    let items;
    if (hist) {
        const merged = new Map(hist.nodes.map((n) => [n.databaseId, n]));
        let missing = false;
        for (const m of members) {
            if (!merged.has(m.databaseId)) {
                missing = true;
                merged.set(m.databaseId, m);
            }
        }
        items = buildSpineFromEdges([...merged.values()], hist.edges);
        // New members mean new edges the cache doesn't know about — refetch in the background.
        if (missing && !historyRefreshing.has(key)) {
            historyRefreshing.add(key);
            const head = members.at(-1);
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
    el.innerHTML = groupHeaderHTML(key, members, !!hist) + renderChainList(items);
    for (const m of members) {
        if (!state.previousWorkflows[m.databaseId]) workflowData[m.databaseId] = m;
    }
    return el;
};

/** Rebuild the whole chains view from the recent window + in-flight collection members. */
const renderChains = () => {
    /** @type {Map<string, Workflow[]>} */
    const groups = new Map();
    /** @type {string[]} */
    const order = [];
    for (const wf of state.recentWorkflows) {
        const key = wf.collectionKey || `solo:${wf.databaseId}`;
        let arr = groups.get(key);
        if (!arr) {
            arr = [];
            groups.set(key, arr);
            order.push(key);
        }
        arr.push(wf);
    }
    // Merge in-flight members of rendered collections so the story includes "now".
    for (const wf of Object.values(state.previousWorkflows)) {
        const arr = wf.collectionKey ? groups.get(wf.collectionKey) : undefined;
        if (arr && !arr.some((m) => m.databaseId === wf.databaseId)) arr.push(wf);
    }

    const frag = document.createDocumentFragment();
    for (const key of order) {
        const members = /** @type {Workflow[]} */ (groups.get(key));
        if (key.startsWith('solo:')) {
            const wf = members[0];
            const card = document.createElement('div');
            card.className = 'workflow-card compact';
            card.id = `wf-recent-${cssId(wf.databaseId)}`;
            card.innerHTML = buildCompactCardHTML(wf, true);
            setCardFilterData(card, wf);
            frag.appendChild(card);
        } else {
            frag.appendChild(buildGroupEl(key, members));
        }
    }
    dom.recentContainer.replaceChildren(frag);
    _mergeDiscoveredLabels();
    _applyFilter();
};

/**
 * Fetch the full connected graph for a collection and re-render its group from it.
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
        historyCache.set(key, { nodes: data.workflows ?? [], edges: data.edges ?? [] });
    } catch {
        return;
    }
    if (state.recentView === 'chains') renderChains();
};

/**
 * Called by live.js when an active workflow appears, changes, or leaves. Re-renders the
 * chains view (debounced) when the workflow belongs to a rendered collection group, so
 * in-flight rows tick along with the live section.
 * @param {string} wfId
 */
export const notifyRecentChainsChanged = (wfId) => {
    if (state.recentView !== 'chains') return;
    const key = (workflowData[wfId] ?? state.previousWorkflows[wfId])?.collectionKey;
    if (!key) return;
    if (!document.querySelector(`.chain-group[data-collectionkey="${CSS.escape(key.toLowerCase())}"]`))
        return;
    clearTimeout(_liveNotifyTimer);
    _liveNotifyTimer = window.setTimeout(renderChains, 300);
};

/* ── View mode switching ─────────────────────────────────── */

/** Reflect the current recent view mode on the section's segmented control. */
export const applyRecentViewUi = () => {
    for (const mode of ['chains', 'compact', 'full']) {
        document
            .getElementById(`recent-view-${mode}`)
            ?.classList.toggle('active', state.recentView === mode);
    }
};

/** Re-render the recent section from scratch in the current mode. */
const rebuildRecent = () => {
    state.lastRecentKeys = '';
    dom.recentContainer.replaceChildren();
    updateRecentWorkflows(state.recentWorkflows);
};

/** @param {'chains' | 'compact' | 'full'} mode */
window.setRecentView = (mode) => {
    if (!['chains', 'compact', 'full'].includes(mode) || state.recentView === mode) return;
    state.recentView = mode;
    state.compactSections.recent = mode === 'compact';
    try {
        localStorage.setItem('recentView', mode);
        localStorage.setItem('compact:recent', mode === 'compact' ? '1' : '0');
    } catch {
        /* ignore */
    }
    applyRecentViewUi();
    rebuildRecent();
    _syncUrl();
};

applyRecentViewUi();

/* ── SSE entry point ─────────────────────────────────────── */

/** @param {Workflow[]} recent */
export const updateRecentWorkflows = (recent) => {
    const list = recent ?? [];
    state.recentWorkflows = list;
    const recentN = list.length;

    dom.recentEmpty.style.display = recentN === 0 ? 'block' : 'none';

    // Only update if the set of keys changed
    const newKeys = list.map((r) => r.databaseId).join(',');
    if (newKeys === state.lastRecentKeys) return;

    const isFirstLoad = state.lastRecentKeys === '';
    const previousKeys = new Set(state.lastRecentKeys.split(',').filter(Boolean));
    state.lastRecentKeys = newKeys;

    if (state.recentView === 'chains') {
        renderChains();
        return;
    }

    // Remove cards no longer in the list
    for (const key of previousKeys) {
        if (!list.some((w) => w.databaseId === key)) {
            document.getElementById(`wf-recent-${cssId(key)}`)?.remove();
        }
    }

    // Add new cards, skip existing ones
    for (let i = 0; i < list.length; i++) {
        const wf = list[i];
        const elId = `wf-recent-${cssId(wf.databaseId)}`;
        const existing = document.getElementById(elId);

        if (existing) {
            // Ensure correct order
            if (existing !== dom.recentContainer.children[i]) {
                dom.recentContainer.insertBefore(existing, dom.recentContainer.children[i] ?? null);
            }
            continue;
        }

        const card = document.createElement('div');
        const forceExpand = state.pendingExpand.delete(wf.databaseId);
        const compact = state.compactSections.recent && !forceExpand;
        card.className = `workflow-card${compact ? ' compact' : ''}`;
        card.id = elId;
        if (!isFirstLoad) {
            const glowName = wf.status === 'Failed' ? 'recent-glow-fail' : 'recent-glow';
            card.style.animation = compact
                ? `${glowName} 0.6s ease forwards`
                : `recent-enter 0.3s ease both, ${glowName} 0.6s ease forwards`;
            card.addEventListener(
                'animationend',
                () => {
                    card.style.animation = 'none';
                },
                { once: true },
            );
        }
        card.innerHTML = compact ? buildCompactCardHTML(wf, true) : buildCardHTML(wf, true);
        setCardFilterData(card, wf);
        dom.recentContainer.insertBefore(card, dom.recentContainer.children[i] ?? null);
    }
    _mergeDiscoveredLabels();
    _applyFilter();
};

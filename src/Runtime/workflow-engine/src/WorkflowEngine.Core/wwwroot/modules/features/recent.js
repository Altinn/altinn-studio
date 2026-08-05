/* Recent workflows — flat card modes plus the collection-grouped "Chains" view.
 *
 * Chains mode groups the recent window by collectionKey and renders each group as a
 * dependency-ordered spine (shared chain renderer): the story of the collection, oldest
 * transition first, side chains indented under the head that produced them. In-flight
 * workflows of a rendered collection are merged in so the story includes "now". The
 * group chrome and per-group history control live in shared/chain-groups.js. */

import { dom, state, workflowData } from '../core/state.js';
import { cssId } from '../core/helpers.js';
import { buildCardHTML, buildCompactCardHTML, setCardFilterData } from '../shared/cards.js';
import { buildGroupEl, onChainGroupsChanged } from '../shared/chain-groups.js';

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

/** Debounce timer for live-driven group re-renders */
let _liveNotifyTimer = 0;

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

onChainGroupsChanged(() => {
    if (state.recentView === 'chains') renderChains();
});

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
    if (
        !dom.recentContainer.querySelector(
            `.chain-group[data-collectionkey="${CSS.escape(key.toLowerCase())}"]`,
        )
    )
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

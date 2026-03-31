/* Filtering, label dropdowns, status chips, tabs */

import { dom, state } from '../core/state.js';
import { esc } from '../core/helpers.js';
import { rebuildDropdown, updateDropdownToggle } from '../shared/dropdown.js';

/** Late-bound references */
/** @type {() => void} */
let _syncUrl = () => {};
/** @type {() => Promise<void>} */
let _loadQuery = async () => {};

/** @param {{ syncUrl: () => void, loadQuery: () => Promise<void> }} fns */
export const bindFilterCallbacks = (fns) => {
    _syncUrl = fns.syncUrl;
    _loadQuery = fns.loadQuery;
};

/* ── Label filter management ─────────────────────────────── */

/**
 * Toggle a label filter value. If the value is the only selected one, clear it.
 * @param {string} key @param {string} value
 */
export const toggleLabelFilter = (key, value) => {
    const v = value.toLowerCase();
    let selected = state.labelFilters.get(key);
    if (!selected) {
        selected = new Set();
        state.labelFilters.set(key, selected);
    }
    const sole = selected.size === 1 && selected.has(v);
    selected.clear();
    if (!sole) selected.add(v);
    if (selected.size === 0) state.labelFilters.delete(key);
    // Sync namespace dropdown if the namespace label filter changed
    if (key === 'namespace') {
        state.namespaceFilter = new Set(state.labelFilters.get('namespace') || []);
        rebuildNamespaceDropdown();
    }
    rebuildLabelFilterBar();
    applyFilter();
    _syncUrl();
    if (state.queryLoaded) _loadQuery();
};

// @ts-ignore — exposed for inline onclick from cards
window.toggleLabelFilter = toggleLabelFilter;

/** Rebuild the label filter chip bar from current state */
const rebuildLabelFilterBar = () => {
    if (!dom.labelFilterBar) return;
    let html = '';
    for (const [key, values] of state.labelFilters) {
        for (const v of values) {
            html += `<span class="label-chip" onclick="toggleLabelFilter('${esc(key)}','${esc(v)}')" title="${esc(key)}=${esc(v)}">`;
            html += `<span class="label-chip-key">${esc(key)}</span>`;
            html += `<span class="label-chip-value">${esc(v)}</span>`;
            html += `<span class="label-chip-x">&times;</span>`;
            html += `</span>`;
        }
    }
    dom.labelFilterBar.innerHTML = html;
};

/** Fetch distinct label values from the DB for known label keys. */
export const fetchLabelValues = async () => {
    // First, discover available label keys by checking common ones
    const commonKeys = ['org', 'app', 'partyId', 'env'];
    const nsParam =
        state.namespaceFilter.size === 1
            ? `&namespace=${encodeURIComponent([...state.namespaceFilter][0])}`
            : '';
    for (const key of commonKeys) {
        try {
            const res = await fetch(
                `/dashboard/labels?key=${encodeURIComponent(key)}${nsParam}`,
            );
            if (res.ok) {
                /** @type {string[]} */
                const values = await res.json();
                if (values.length > 0) {
                    state.labelValues.set(key, values);
                }
            }
        } catch {
            /* non-critical */
        }
    }
    state.labelValuesLoaded = true;

    // Fetch namespaces for the namespace picker
    await fetchNamespaces();
};

/* ── Namespace picker ───────────────────────────────────── */

/** Fetch distinct namespaces and populate the dropdown. */
const fetchNamespaces = async () => {
    try {
        const res = await fetch('/dashboard/namespaces');
        if (!res.ok) return;
        /** @type {string[]} */
        const namespaces = await res.json();
        state.allNamespaces = new Set(namespaces);
        rebuildNamespaceDropdown();
    } catch {
        /* non-critical */
    }
};

const rebuildNamespaceDropdown = () => {
    rebuildDropdown(dom.nsList, state.allNamespaces, state.namespaceFilter);
    updateDropdownToggle(state.namespaceFilter, dom.nsSelected, dom.nsDropdown);
    // Disable the dropdown if there's only one namespace (or none)
    dom.nsDropdown.classList.toggle('disabled', state.allNamespaces.size <= 1);
};

/** Handle clicks inside the namespace dropdown list. */
dom.nsList.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);

    // Handle select-all / clear actions
    const action = target.closest('[data-action]');
    if (action) {
        const act = /** @type {HTMLElement} */ (action).dataset.action;
        if (act === 'select-all') {
            state.namespaceFilter = new Set(state.allNamespaces);
        } else if (act === 'clear') {
            state.namespaceFilter.clear();
        }
        syncNamespaceToLabelFilter();
        rebuildNamespaceDropdown();
        return;
    }

    // Handle individual item toggle
    const item = /** @type {HTMLElement | null} */ (target.closest('.dropdown-item'));
    if (!item) return;
    const value = item.dataset.value || '';
    if (state.namespaceFilter.has(value)) {
        state.namespaceFilter.delete(value);
    } else {
        state.namespaceFilter.add(value);
    }
    syncNamespaceToLabelFilter();
    rebuildNamespaceDropdown();
});

/** Sync the namespace filter set into the labelFilters map and trigger re-filter. */
const syncNamespaceToLabelFilter = () => {
    if (state.namespaceFilter.size === 0 || state.namespaceFilter.size === state.allNamespaces.size) {
        // No filter or all selected = show everything
        state.labelFilters.delete('namespace');
    } else {
        state.labelFilters.set('namespace', new Set(state.namespaceFilter));
    }
    rebuildLabelFilterBar();
    applyFilter();
    _syncUrl();
    if (state.queryLoaded) _loadQuery();
};

/* ── Filtering ───────────────────────────────────────────── */

/** @returns {boolean} */
export const hasActiveFilter = () =>
    !!(
        state.liveFilter ||
        state.querySearch ||
        state.sectionStatus.scheduled ||
        state.sectionStatus.live ||
        state.sectionStatus.recent ||
        state.sectionStatus.query ||
        state.labelFilters.size
    );

export const applyFilter = () => {
    const lf = state.liveFilter;
    const labelF = state.labelFilters;
    /**
     * @param {HTMLElement} container
     * @param {HTMLElement | null} countEl
     * @param {string} sectionStatus
     * @param {boolean} [isLiveTab]
     */
    const filterContainer = (container, countEl, sectionStatus, isLiveTab) => {
        const cards = /** @type {HTMLElement[]} */ ([
            ...container.querySelectorAll('.workflow-card'),
        ]);
        let matched = 0;
        /** @type {Record<string, number>} */
        const statusCounts = {};
        for (const card of cards) {
            const textHidden = isLiveTab && lf && !(card.dataset.filter || '').includes(lf);
            const cardTags = (card.dataset.status || '').split(' ');
            const statusHidden =
                sectionStatus && !sectionStatus.split(',').some((s) => cardTags.includes(s));

            // Label-based filtering: check each active label filter against card's labels
            let labelHidden = false;
            if (labelF.size > 0) {
                const cardLabels = card.dataset.labels || '';
                const cardNs = card.dataset.namespace || '';
                const cardCorr = card.dataset.correlationid || '';
                for (const [key, values] of labelF) {
                    if (key === 'namespace') {
                        if (!values.has(cardNs)) {
                            labelHidden = true;
                            break;
                        }
                    } else if (key === 'correlationId') {
                        if (!values.has(cardCorr)) {
                            labelHidden = true;
                            break;
                        }
                    } else {
                        // Check if any of the selected values for this key match
                        const hasMatch = [...values].some((v) =>
                            cardLabels.includes(`${key}:${v}`),
                        );
                        if (!hasMatch) {
                            labelHidden = true;
                            break;
                        }
                    }
                }
            }

            const hidden = textHidden || statusHidden || labelHidden;
            card.classList.toggle('filtered-out', hidden);
            if (!hidden) matched++;
            for (const tag of (card.dataset.status || '').toLowerCase().split(' ')) {
                if (tag) statusCounts[tag] = (statusCounts[tag] || 0) + 1;
            }
        }
        if (countEl) {
            const hasFilter = (isLiveTab && lf) || sectionStatus || labelF.size > 0;
            countEl.textContent =
                hasFilter && cards.length > 0 ? `${matched} / ${cards.length}` : `${cards.length}`;
        }
        const section =
            container.closest('.section')?.querySelector('.section-chips') ||
            container.parentElement?.querySelector('.section-chips');
        if (section) {
            for (const chip of section.querySelectorAll('.chip')) {
                const st = /** @type {HTMLElement} */ (chip).dataset.status || '';
                const label =
                    /** @type {HTMLElement} */ (chip).dataset.label ||
                    /** @type {HTMLElement} */ ((chip).dataset.label = (
                        chip.textContent?.trim() || ''
                    ).replace(/\s*\(.*\)$/, ''));
                if (!st) {
                    chip.textContent = `${label} (${cards.length})`;
                } else {
                    chip.textContent = `${label} (${statusCounts[st] || 0})`;
                }
            }
        }
    };
    filterContainer(dom.scheduledContainer, null, state.sectionStatus.scheduled, true);
    filterContainer(dom.liveContainer, null, state.sectionStatus.live, true);
    filterContainer(dom.recentContainer, null, state.sectionStatus.recent, true);
    filterContainer(dom.queryContainer, null, state.sectionStatus.query, false);
};

/** @param {string} value */
const setLiveFilter = (value) => {
    state.liveFilter = value.toLowerCase();
    dom.liveFilterInput.value = value;
    dom.liveFilterClear.classList.toggle('visible', value.length > 0);
    applyFilter();
};

dom.liveFilterInput.addEventListener('input', () => setLiveFilter(dom.liveFilterInput.value));
dom.liveFilterClear.addEventListener('click', () => {
    setLiveFilter('');
    dom.liveFilterInput.focus();
});

// Query search — triggers on Enter key
dom.querySearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        state.querySearch = dom.querySearchInput.value.trim();
        _syncUrl();
        if (state.queryLoaded) _loadQuery();
    }
});

/** Check for new namespaces from workflow data and re-fetch if found. */
export const mergeDiscoveredLabels = () => {
    const known = state.allNamespaces;
    for (const wf of Object.values(state.previousWorkflows)) {
        if (wf.namespace && !known.has(wf.namespace)) {
            fetchNamespaces();
            return;
        }
    }
    for (const wf of state.recentWorkflows) {
        if (wf.namespace && !known.has(wf.namespace)) {
            fetchNamespaces();
            return;
        }
    }
};

for (const bar of document.querySelectorAll('.section-chips')) {
    bar.addEventListener('click', (e) => {
        const chip = /** @type {HTMLElement | null} */ (
            /** @type {HTMLElement} */ (e.target).closest('.chip')
        );
        if (!chip) return;
        const section = /** @type {HTMLElement} */ (bar).dataset.section || '';
        const value = chip.dataset.status || '';
        state.sectionStatus[section] = value;
        for (const c of bar.querySelectorAll('.chip')) c.classList.toggle('active', c === chip);
        applyFilter();
        _syncUrl();
    });
}

/* ── Tabs ────────────────────────────────────────────────── */

/** @param {string} tabName */
export const switchTab = (tabName) => {
    for (const t of document.querySelectorAll('.tab')) {
        t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    }
    for (const p of document.querySelectorAll('.tab-panel')) {
        p.classList.toggle('active', p.id === `panel-${tabName}`);
    }
    if (tabName === 'query') {
        state.queryLoaded = true;
        _loadQuery();
    }
    _syncUrl();
};

// @ts-ignore — exposed for inline onclick
window.switchTab = switchTab;

/* Filtering, label dropdowns, status chips, tabs */

import { dom, state, engineUrl } from '../core/state.js';
import { esc } from '../core/helpers.js';

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
  for (const key of commonKeys) {
    try {
      const res = await fetch(`${engineUrl}/dashboard/labels?key=${encodeURIComponent(key)}`);
      if (res.ok) {
        /** @type {string[]} */
        const values = await res.json();
        if (values.length > 0) {
          state.labelValues.set(key, values);
        }
      }
    } catch { /* non-critical */ }
  }
  state.labelValuesLoaded = true;
};

/* ── Filtering ───────────────────────────────────────────── */

/** @returns {boolean} */
export const hasActiveFilter = () =>
  !!(state.liveFilter || state.querySearch || state.sectionStatus.scheduled || state.sectionStatus.live || state.sectionStatus.recent || state.sectionStatus.query || state.labelFilters.size);

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
    const cards = /** @type {HTMLElement[]} */ ([...container.querySelectorAll('.workflow-card')]);
    let matched = 0;
    /** @type {Record<string, number>} */
    const statusCounts = {};
    for (const card of cards) {
      const textHidden = isLiveTab && lf && !(card.dataset.filter || '').includes(lf);
      const cardTags = (card.dataset.status || '').split(' ');
      const statusHidden = sectionStatus && !sectionStatus.split(',').some(s => cardTags.includes(s));

      // Label-based filtering: check each active label filter against card's labels
      let labelHidden = false;
      if (labelF.size > 0) {
        const cardLabels = card.dataset.labels || '';
        const cardNs = card.dataset.namespace || '';
        for (const [key, values] of labelF) {
          if (key === 'namespace') {
            if (!values.has(cardNs)) { labelHidden = true; break; }
          } else {
            // Check if any of the selected values for this key match
            const hasMatch = [...values].some(v => cardLabels.includes(`${key}:${v}`));
            if (!hasMatch) { labelHidden = true; break; }
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
      countEl.textContent = (hasFilter && cards.length > 0) ? `${matched} / ${cards.length}` : `${cards.length}`;
    }
    const section = container.closest('.section')?.querySelector('.section-chips') ||
                     container.parentElement?.querySelector('.section-chips');
    if (section) {
      for (const chip of section.querySelectorAll('.chip')) {
        const st = /** @type {HTMLElement} */ (chip).dataset.status || '';
        const label = /** @type {HTMLElement} */ (chip).dataset.label ||
                      (/** @type {HTMLElement} */ (chip).dataset.label = (chip.textContent?.trim() || '').replace(/\s*\(.*\)$/, ''));
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
dom.liveFilterClear.addEventListener('click', () => { setLiveFilter(''); dom.liveFilterInput.focus(); });

// Query search — triggers on Enter key
dom.querySearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    state.querySearch = dom.querySearchInput.value.trim();
    _syncUrl();
    if (state.queryLoaded) _loadQuery();
  }
});

/** Merge label values discovered from SSE workflow cards. */
export const mergeDiscoveredLabels = () => {
  // Labels are now stored on cards as data-labels="key:value,key:value"
  // No dynamic dropdown to update — label filter chips are click-driven from card segments
};

for (const bar of document.querySelectorAll('.section-chips')) {
  bar.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.chip'));
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

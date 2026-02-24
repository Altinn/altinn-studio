/* Filtering, org/app dropdowns, status chips, tabs */

import { dom, state, engineUrl } from '../core/state.js';
import { esc } from '../core/helpers.js';
import { rebuildDropdown, updateDropdownToggle } from '../shared/dropdown.js';
import { rebuildSelectedOnlyChips, wireChipBar, updatePartyGuidLabels } from '../shared/chips.js';

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

/* ── Org / app management ────────────────────────────────── */

/**
 * Register an org+app pair in the orgsAndApps map.
 * @param {string} org @param {string} app
 * @returns {boolean} true if something new was added
 */
export const addOrgAndApp = (org, app) => {
  const o = org.toLowerCase();
  const a = app.toLowerCase();
  let changed = false;
  if (!state.orgsAndApps.has(o)) { state.orgsAndApps.set(o, new Set()); changed = true; }
  const apps = /** @type {Set<string>} */ (state.orgsAndApps.get(o));
  if (!apps.has(a)) { apps.add(a); changed = true; }
  return changed;
};

/** Get the set of apps available for the currently selected org(s). */
export const getAppsForSelectedOrgs = () => {
  const result = new Set();
  if (state.orgFilter.size === 0) return result;
  const orgs = state.orgFilter;
  for (const o of orgs) {
    const apps = state.orgsAndApps.get(o);
    if (apps) for (const a of apps) result.add(a);
  }
  return result;
};

/** Rebuild the app dropdown based on current org selection. */
export const refreshAppDropdown = () => {
  const availableApps = getAppsForSelectedOrgs();

  if (state.orgsAndAppsLoaded) {
    for (const a of [...state.appFilter]) {
      if (!availableApps.has(a)) state.appFilter.delete(a);
    }
  }

  rebuildDropdown(dom.appList, availableApps, state.appFilter);
  updateDropdownToggle('app');

  const noOrg = state.orgFilter.size === 0;
  dom.appDropdown.classList.toggle('disabled', noOrg);

  if (availableApps.size > 0 && availableApps.size <= 10 && state.appFilter.size === 0) {
    for (const a of availableApps) state.appFilter.add(a);
    rebuildDropdown(dom.appList, availableApps, state.appFilter);
    updateDropdownToggle('app');
    _syncUrl();
  }
};

/** Rebuild both dropdowns and auto-select when there's only one choice. */
export const refreshOrgAppDropdowns = () => {
  const allOrgs = new Set(state.orgsAndApps.keys());
  rebuildDropdown(dom.orgList, allOrgs, state.orgFilter);
  updateDropdownToggle('org');

  if (allOrgs.size === 1 && state.orgFilter.size === 0) {
    const sole = [...allOrgs][0];
    state.orgFilter.add(sole);
    rebuildDropdown(dom.orgList, allOrgs, state.orgFilter);
    updateDropdownToggle('org');
  }

  refreshAppDropdown();
};

/** Fetch distinct org+app pairs from the DB to populate dropdowns. */
export const fetchOrgsAndApps = () => {
  fetch(`${engineUrl}/dashboard/orgs-and-apps`).then(r => r.json()).then(/** @param {{ org: string, app: string }[]} pairs */ pairs => {
    for (const p of pairs) {
      if (p.org && p.app) addOrgAndApp(p.org, p.app);
    }
    state.orgsAndAppsLoaded = true;
    refreshOrgAppDropdowns();
    applyFilter();
    _syncUrl();
    if (state.queryLoaded) _loadQuery();
  }).catch(() => {});
};

/* ── Filtering ───────────────────────────────────────────── */

/** @returns {boolean} */
export const hasActiveFilter = () =>
  !!(state.liveFilter || state.querySearch || state.sectionStatus.scheduled || state.sectionStatus.live || state.sectionStatus.recent || state.sectionStatus.query || state.orgFilter.size || state.appFilter.size || state.partyFilter.size || state.guidFilter.size);

export const applyFilter = () => {
  const lf = state.liveFilter;
  const of_ = state.orgFilter;
  const af = state.appFilter;
  const pf = state.partyFilter;
  const gf = state.guidFilter;
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
      const orgHidden = of_.size > 0 && !of_.has(card.dataset.org || '');
      const appHidden = af.size > 0 && !af.has(card.dataset.app || '');
      const partyHidden = isLiveTab && pf.size > 0 && !pf.has(card.dataset.party || '');
      const guidHidden = isLiveTab && gf.size > 0 && !gf.has(card.dataset.guid || '');
      const hidden = textHidden || statusHidden || orgHidden || appHidden || partyHidden || guidHidden;
      card.classList.toggle('filtered-out', hidden);
      if (!hidden) matched++;
      for (const tag of (card.dataset.status || '').toLowerCase().split(' ')) {
        if (tag) statusCounts[tag] = (statusCounts[tag] || 0) + 1;
      }
    }
    if (countEl) {
      const hasFilter = (isLiveTab && lf) || sectionStatus || of_.size > 0 || af.size > 0 || (isLiveTab && pf.size > 0) || (isLiveTab && gf.size > 0);
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

/** @param {string} org */
export const toggleOrgFilter = (org) => {
  const v = org.toLowerCase();
  const sole = state.orgFilter.size === 1 && state.orgFilter.has(v);
  state.orgFilter.clear();
  if (!sole) state.orgFilter.add(v);
  const allOrgs = new Set(state.orgsAndApps.keys());
  rebuildDropdown(dom.orgList, allOrgs, state.orgFilter);
  updateDropdownToggle('org');
  refreshAppDropdown();
  applyFilter();
  _syncUrl();
  if (state.queryLoaded) _loadQuery();
};

/** @param {string} app */
export const toggleAppFilter = (app) => {
  const v = app.toLowerCase();
  const sole = state.appFilter.size === 1 && state.appFilter.has(v);
  state.appFilter.clear();
  if (!sole) state.appFilter.add(v);
  const availableApps = getAppsForSelectedOrgs();
  rebuildDropdown(dom.appList, availableApps, state.appFilter);
  updateDropdownToggle('app');
  applyFilter();
  _syncUrl();
  if (state.queryLoaded) _loadQuery();
};

/** @param {string} party */
export const togglePartyFilter = (party) => {
  const v = party.toLowerCase();
  const sole = state.partyFilter.size === 1 && state.partyFilter.has(v);
  state.partyFilter.clear();
  if (!sole) state.partyFilter.add(v);
  rebuildSelectedOnlyChips(dom.partyChips, state.partyFilter, 'party-chip');
  updatePartyGuidLabels();
  applyFilter();
  _syncUrl();
  if (state.queryLoaded) _loadQuery();
};

/** @param {string} guid */
export const toggleGuidFilter = (guid) => {
  const v = guid.toLowerCase();
  const sole = state.guidFilter.size === 1 && state.guidFilter.has(v);
  state.guidFilter.clear();
  if (!sole) state.guidFilter.add(v);
  rebuildSelectedOnlyChips(dom.guidChips, state.guidFilter, 'guid-chip', v => v.substring(0, 8));
  updatePartyGuidLabels();
  applyFilter();
  _syncUrl();
  if (state.queryLoaded) _loadQuery();
};

// Expose for inline onclick
// @ts-ignore
window.toggleOrgFilter = toggleOrgFilter;
// @ts-ignore
window.toggleAppFilter = toggleAppFilter;
// @ts-ignore
window.togglePartyFilter = togglePartyFilter;
// @ts-ignore
window.toggleGuidFilter = toggleGuidFilter;

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

wireChipBar(dom.partyChips, togglePartyFilter);
wireChipBar(dom.guidChips, toggleGuidFilter);

// Wire org/app-specific list click handlers
for (const dd of document.querySelectorAll('.dropdown')) {
  const list = dd.querySelector('.dropdown-list');
  if (list) {
    list.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = /** @type {HTMLElement} */ (e.target);
      if (target.classList.contains('dropdown-action')) {
        const action = target.dataset.action;
        if (dd.id === 'org-dropdown') {
          if (action === 'clear') state.orgFilter.clear();
          else if (action === 'select-all') for (const k of state.orgsAndApps.keys()) state.orgFilter.add(k);
          refreshOrgAppDropdowns(); refreshAppDropdown(); applyFilter(); _syncUrl(); if (state.queryLoaded) _loadQuery();
        } else if (dd.id === 'app-dropdown') {
          const avail = getAppsForSelectedOrgs();
          if (action === 'clear') state.appFilter.clear();
          else if (action === 'select-all') for (const a of avail) state.appFilter.add(a);
          rebuildDropdown(dom.appList, avail, state.appFilter); updateDropdownToggle('app'); applyFilter(); _syncUrl(); if (state.queryLoaded) _loadQuery();
        }
        return;
      }
      const item = /** @type {HTMLElement | null} */ (target.closest('.dropdown-item'));
      if (!item) return;
      const v = item.dataset.value || '';
      if (dd.id === 'org-dropdown') toggleOrgFilter(v);
      else if (dd.id === 'app-dropdown') toggleAppFilter(v);
    });
  }
}

/** Merge org/app values discovered from SSE into dropdown lists. */
export const mergeDiscoveredOrgsAndApps = () => {
  let changed = false;
  for (const card of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.workflow-card[data-org]'))) {
    const o = card.dataset.org;
    const a = card.dataset.app;
    if (o && a && addOrgAndApp(o, a)) changed = true;
  }
  if (changed) refreshOrgAppDropdowns();
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


/* ============================================================
 *  Section 3: SSE connection + org/app fetching + hot-reload
 * ============================================================ */

import { dom, engineUrl, state } from './state.js';
import { esc } from './helpers.js';

/* ============================================================
 *  ORG / APP MANAGEMENT
 * ============================================================ */

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

/**
 * Rebuild dropdown list items.
 * @param {HTMLElement} listEl
 * @param {Set<string>} allValues
 * @param {Set<string>} filterSet
 */
export const rebuildDropdown = (listEl, allValues, filterSet) => {
  const sorted = [...allValues].sort();
  listEl.innerHTML = '';
  if (sorted.length > 0) {
    const row = document.createElement('div');
    row.className = 'dropdown-actions';
    const selAll = document.createElement('span');
    selAll.className = 'dropdown-action';
    selAll.textContent = 'Select all';
    selAll.dataset.action = 'select-all';
    if (filterSet.size === sorted.length) selAll.classList.add('dim');
    const clearAll = document.createElement('span');
    clearAll.className = 'dropdown-action';
    clearAll.textContent = 'Clear all';
    clearAll.dataset.action = 'clear';
    if (filterSet.size === 0) clearAll.classList.add('dim');
    row.appendChild(selAll);
    row.appendChild(clearAll);
    listEl.appendChild(row);
  }
  for (const v of sorted) {
    const item = document.createElement('div');
    item.className = `dropdown-item${filterSet.has(v) ? ' selected' : ''}`;
    item.dataset.value = v;
    item.textContent = v;
    listEl.appendChild(item);
  }
};

/**
 * Update the toggle button to show selected chips.
 * @param {'org' | 'app'} which
 */
export const updateDropdownToggle = (which) => {
  const filterSet = which === 'org' ? state.orgFilter : state.appFilter;
  const selectedEl = which === 'org' ? dom.orgSelected : dom.appSelected;
  const dropdown = which === 'org' ? dom.orgDropdown : dom.appDropdown;

  if (filterSet.size === 0) {
    selectedEl.innerHTML = '';
    dropdown.classList.remove('has-selection');
  } else {
    selectedEl.innerHTML = [...filterSet].sort().map(v => `<span class="mini-chip">${esc(v)}</span>`).join('');
    dropdown.classList.add('has-selection');
  }
};

/** Late-bound references set by filters.js to break circular dependency */
/** @type {() => void} */
let _applyFilter = () => {};
/** @type {() => void} */
let _syncUrl = () => {};
/** @type {() => Promise<void>} */
let _loadQuery = async () => {};

/** @param {{ applyFilter: () => void, syncUrl: () => void, loadQuery: () => Promise<void> }} fns */
export const bindSSECallbacks = (fns) => {
  _applyFilter = fns.applyFilter;
  _syncUrl = fns.syncUrl;
  _loadQuery = fns.loadQuery;
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
    _applyFilter();
    _syncUrl();
    if (state.queryLoaded) _loadQuery();
  }).catch(() => {});
};

/* ============================================================
 *  SSE CONNECTION
 * ============================================================ */

let disconnectTimer = 0;

/**
 * @param {string} url
 * @param {(data: unknown) => void} onMessage
 * @param {{ showStatus?: boolean }} [opts]
 */
export const connectSSE = (url, onMessage, opts) => {
  const es = new EventSource(url);
  const showStatus = opts?.showStatus ?? false;

  if (showStatus) {
    es.onopen = () => {
      clearTimeout(disconnectTimer);
      dom.sseDot.className = 'sse-dot connected';
      dom.engineStatusLabel.className = 'engine-status-label';
      fetchOrgsAndApps();
    };
  }

  es.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); }
    catch (err) { console.error('SSE parse error:', err); }
  };

  es.onerror = () => {
    if (showStatus) {
      dom.sseDot.className = 'sse-dot disconnected';
      dom.engineIcon.setAttribute('class', 'engine-icon stopped');
      dom.engineIcon.setAttribute('title', 'Disconnected');
      clearTimeout(disconnectTimer);
      disconnectTimer = setTimeout(() => {
        dom.engineStatusLabel.className = 'engine-status-label visible';
      }, 1000);
    }
    es.close();
    setTimeout(() => connectSSE(url, onMessage, opts), 2000);
  };
};

/* ============================================================
 *  HOT-RELOAD  (SSE from dashboard server on file change)
 * ============================================================ */

let hotReloadConnectedOnce = false;
let hotReloadDisabled = false;

export const watchForChanges = () => {
  if (hotReloadDisabled) return;
  const es = new EventSource('/api/hot-reload');
  es.onopen = () => {
    if (hotReloadConnectedOnce) {
      es.close();
      location.reload();
      return;
    }
    hotReloadConnectedOnce = true;
  };
  es.onmessage = () => location.reload();
  es.onerror = () => {
    es.close();
    if (!hotReloadConnectedOnce) {
      hotReloadDisabled = true;
      return;
    }
    setTimeout(watchForChanges, 2000);
  };
};

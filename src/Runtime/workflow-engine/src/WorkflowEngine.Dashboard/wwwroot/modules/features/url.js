/* URL sync — persist tab + filters to query params */

import { dom, state } from '../core/state.js';
import { updateDropdownToggle } from '../shared/dropdown.js';
import { rebuildSelectedOnlyChips, updatePartyGuidLabels } from '../shared/chips.js';
import { getTheme, setTheme, updateThemeToggle } from './theme.js';

/** Late-bound references set from app.js to break circular dependency */
/** @type {() => void} */
let _switchTab = () => {};
/** @type {() => Promise<void>} */
let _loadQuery = async () => {};
/** @type {() => void} */
let _applyFilter = () => {};

/** @param {{ switchTab: (tab: string) => void, loadQuery: () => Promise<void>, applyFilter: () => void }} fns */
export const bindUrlCallbacks = (fns) => {
  _switchTab = fns.switchTab;
  _loadQuery = fns.loadQuery;
  _applyFilter = fns.applyFilter;
};

/** @type {{ from: string, to: string } | null} */
export let customTimeRange = null;

/** @param {{ from: string, to: string } | null} v */
export const setCustomTimeRange = (v) => { customTimeRange = v; };

/** @type {number} Time range in minutes, 0 = all time */
export let queryTimeRange = 0;

/** @param {number} v */
export const setQueryTimeRange = (v) => { queryTimeRange = v; };

export const timeLabels = { 0:'All time', 5:'5m', 15:'15m', 30:'30m', 60:'1h', 360:'6h', 1440:'24h', 10080:'7d' };

/** Format a Date as local `YYYY-MM-DDTHH:MM` for datetime-local inputs. */
export const toLocalDatetime = (d) => {
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const updateTimeLabel = () => {
  const label = /** @type {HTMLElement} */ (document.getElementById('time-range-label'));
  const btn = /** @type {HTMLElement} */ (document.getElementById('time-range-btn'));
  if (customTimeRange) {
    label.textContent = 'Custom';
    btn.classList.add('has-range');
  } else if (queryTimeRange > 0) {
    label.textContent = timeLabels[queryTimeRange] || `${queryTimeRange}m`;
    btn.classList.add('has-range');
  } else {
    label.textContent = 'All time';
    btn.classList.remove('has-range');
  }
};

export const syncUrl = () => {
  const p = new URLSearchParams();
  const theme = getTheme();
  if (theme) p.set('theme', theme);
  const tab = document.querySelector('.tab.active')?.getAttribute('data-tab');
  if (tab && tab !== 'live') p.set('tab', tab);
  if (state.querySearch) p.set('q', state.querySearch);
  if (state.sectionStatus.scheduled) p.set('ss', state.sectionStatus.scheduled);
  if (state.sectionStatus.live) p.set('ls', state.sectionStatus.live);
  if (state.sectionStatus.recent) p.set('rs', state.sectionStatus.recent);
  if (state.sectionStatus.query) p.set('qs', state.sectionStatus.query);
  if (customTimeRange) { p.set('qtf', customTimeRange.from); p.set('qtt', customTimeRange.to); }
  else if (queryTimeRange) p.set('qt', String(queryTimeRange));
  if (/** @type {HTMLInputElement} */ (document.getElementById('retried-check'))?.checked) p.set('qr', '1');
  if (state.orgFilter.size) p.set('org', [...state.orgFilter].join(','));
  if (state.appFilter.size) p.set('app', [...state.appFilter].join(','));
  if (state.partyFilter.size) p.set('party', [...state.partyFilter].join(','));
  if (state.guidFilter.size) p.set('guid', [...state.guidFilter].join(','));
  const collapsed = [];
  const expanded = [];
  for (const [id, key] of [['scheduled-section','sched'],['live-section','inbox'],['recent-section','recent']]) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (id === 'scheduled-section') { if (!el.classList.contains('collapsed')) expanded.push(key); }
    else { if (el.classList.contains('collapsed')) collapsed.push(key); }
  }
  if (collapsed.length) p.set('c', collapsed.join(','));
  if (expanded.length) p.set('e', expanded.join(','));
  const cpt = Object.entries(state.compactSections).filter(([, v]) => v).map(([k]) => k);
  if (cpt.length) p.set('cpt', cpt.join(','));
  const expKeys = /** @type {string[]} */ ([]);
  for (const [section, container] of [['inbox', dom.liveContainer], ['recent', dom.recentContainer]]) {
    if (!state.compactSections[section]) continue;
    for (const el of container.querySelectorAll('.workflow-card:not(.compact)')) {
      const k = /** @type {HTMLElement} */ (el).dataset.wfkey;
      if (k) expKeys.push(k);
    }
  }
  if (expKeys.length) { try { p.set('exp', btoa(expKeys.join(','))); } catch { /* ignore */ } }
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
};

export const restoreUrl = () => {
  const p = new URLSearchParams(location.search);
  const isShared = p.toString().length > 0;

  if (isShared) {
    document.getElementById('scheduled-section')?.classList.add('collapsed');
    document.getElementById('live-section')?.classList.remove('collapsed');
    document.getElementById('recent-section')?.classList.remove('collapsed');
    for (const s of Object.keys(state.compactSections)) state.compactSections[s] = s === 'query';
    state.sectionStatus = { live: '', recent: '', query: 'failed' };
    queryTimeRange = 0;
    customTimeRange = null;
    const rc = /** @type {HTMLInputElement | null} */ (document.getElementById('retried-check'));
    if (rc) rc.checked = false;
    for (const s of ['enqueued', 'processing', 'requeued', 'completed', 'failed', 'canceled']) {
      const el = /** @type {HTMLInputElement | null} */ (document.getElementById(`${s}-check`));
      if (el) el.checked = s === 'failed';
    }
    for (const bar of document.querySelectorAll('.section-chips')) {
      for (const c of bar.querySelectorAll('.chip')) {
        c.classList.toggle('active', (/** @type {HTMLElement} */ (c).dataset.status || '') === '');
      }
    }
  }

  const urlTheme = p.get('theme');
  if (urlTheme) setTheme(urlTheme);
  else if (!isShared) { const stored = getTheme(); updateThemeToggle(stored); }

  const q = p.get('q');
  if (q) { state.querySearch = q; dom.querySearchInput.value = q; }
  for (const [key, section] of [['ss', 'scheduled'], ['ls', 'live'], ['rs', 'recent'], ['qs', 'query']]) {
    const v = p.get(key);
    if (v) {
      state.sectionStatus[section] = v;
      if (section === 'query') {
        const active = new Set(v.split(',').map(s => s.trim()).filter(Boolean));
        for (const s of ['enqueued', 'processing', 'requeued', 'completed', 'failed', 'canceled']) {
          const el = /** @type {HTMLInputElement | null} */ (document.getElementById(`${s}-check`));
          if (el) el.checked = active.has(s);
        }
      } else {
        const bar = document.querySelector(`.section-chips[data-section="${section}"]`);
        if (bar) {
          for (const c of bar.querySelectorAll('.chip')) c.classList.toggle('active', (c.dataset.status || '') === v);
        }
      }
    }
  }
  const qtf = p.get('qtf');
  const qtt = p.get('qtt');
  if (qtf && qtt) {
    customTimeRange = { from: qtf, to: qtt };
    updateTimeLabel();
  } else {
    const qt = parseInt(p.get('qt') || '0', 10);
    if (qt > 0) {
      queryTimeRange = qt;
      updateTimeLabel();
      const dropdown = document.getElementById('time-dropdown');
      if (dropdown) for (const o of dropdown.querySelectorAll('.time-option')) o.classList.toggle('active', (/** @type {HTMLElement} */ (o).dataset.minutes || '') === String(qt));
    }
  }
  if (p.get('qr') === '1') {
    const check = /** @type {HTMLInputElement | null} */ (document.getElementById('retried-check'));
    if (check) check.checked = true;
  }
  for (const v of (p.get('org') || '').split(',').filter(Boolean)) state.orgFilter.add(v);
  for (const v of (p.get('app') || '').split(',').filter(Boolean)) state.appFilter.add(v);
  for (const v of (p.get('party') || '').split(',').filter(Boolean)) state.partyFilter.add(v);
  for (const v of (p.get('guid') || '').split(',').filter(Boolean)) state.guidFilter.add(v);
  if (state.orgFilter.size || state.appFilter.size) {
    updateDropdownToggle('org');
    updateDropdownToggle('app');
    dom.appDropdown.classList.toggle('disabled', state.orgFilter.size === 0);
  }
  if (state.partyFilter.size || state.guidFilter.size) {
    rebuildSelectedOnlyChips(dom.partyChips, state.partyFilter, 'party-chip');
    rebuildSelectedOnlyChips(dom.guidChips, state.guidFilter, 'guid-chip', v => v.substring(0, 8));
    updatePartyGuidLabels();
  }
  if (state.orgFilter.size || state.appFilter.size || state.partyFilter.size || state.guidFilter.size) {
    _applyFilter();
  }
  for (const s of (p.get('cpt') || '').split(',').filter(Boolean)) {
    if (s in state.compactSections) state.compactSections[s] = true;
  }
  const expParam = p.get('exp');
  if (expParam) {
    try { for (const k of atob(expParam).split(',').filter(Boolean)) state.pendingExpand.add(k); } catch { /* ignore */ }
  }
  const keyMap = { sched: 'scheduled-section', inbox: 'live-section', recent: 'recent-section' };
  const coll = (p.get('c') || '').split(',').filter(Boolean);
  const exp = (p.get('e') || '').split(',').filter(Boolean);
  for (const k of coll) { const el = document.getElementById(keyMap[k] || ''); if (el) el.classList.add('collapsed'); }
  for (const k of exp) { const el = document.getElementById(keyMap[k] || ''); if (el) el.classList.remove('collapsed'); }
  const tab = p.get('tab');
  if (tab) _switchTab(tab);
};

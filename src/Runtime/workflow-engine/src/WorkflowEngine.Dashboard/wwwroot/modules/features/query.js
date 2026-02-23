/* Query tab — on-demand DB fetch with pagination */

import { dom, state, engineUrl } from '../core/state.js';
import { buildCardHTML, buildCompactCardHTML, setCardFilterData } from '../shared/cards.js';
import { syncUrl, customTimeRange, queryTimeRange, setCustomTimeRange, setQueryTimeRange, updateTimeLabel, toLocalDatetime } from '../core/url.js';
import { applyFilter } from './filters.js';

const QUERY_PAGE = 100;

// Pagination state
let queryPage = 0;
/** @type {(string | null)[]} Cursor for each page boundary: pageCursors[0]=null (first page), pageCursors[1]=cursor after page 0, etc. */
let queryPageCursors = [null];
let queryTotalCount = 0;

/** Update pager UI */
const updatePager = (pageSize, totalCount) => {
  queryTotalCount = totalCount;
  const pager = document.getElementById('query-pager');
  const info = document.getElementById('pager-info');
  const prev = /** @type {HTMLButtonElement} */ (document.getElementById('pager-prev'));
  const next = /** @type {HTMLButtonElement} */ (document.getElementById('pager-next'));
  if (!pager || !info) return;

  pager.style.display = '';
  if (totalCount === 0) {
    info.textContent = '0 of 0';
    prev.disabled = true;
    next.disabled = true;
    return;
  }
  const from = queryPage * QUERY_PAGE + 1;
  const to = Math.min(from + pageSize - 1, totalCount);
  info.textContent = `${from.toLocaleString()}\u2013${to.toLocaleString()} of ${totalCount.toLocaleString()}`;
  prev.disabled = queryPage === 0;
  next.disabled = to >= totalCount;
};

/** @param {{ page?: number }} [opts] */
const fetchQuery = async (opts) => {
  const page = opts?.page ?? 0;
  const hs = state.sectionStatus.query;
  const searchTerm = state.querySearch;
  const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);
  const retried = /** @type {HTMLInputElement} */ (document.getElementById('retried-check')).checked;

  const dbStatus = isGuid ? '' : (hs || '');
  const effectiveCustom = isGuid ? null : customTimeRange;
  const effectiveTimeRange = isGuid ? 0 : queryTimeRange;
  const effectiveRetried = isGuid ? false : retried;

  const btn = /** @type {HTMLButtonElement} */ (document.getElementById('query-load'));
  btn.disabled = true;
  btn.classList.add('spinning');
  const spinStart = Date.now();

  try {
    const params = new URLSearchParams();
    params.set('limit', String(QUERY_PAGE));
    if (dbStatus) params.set('status', dbStatus);
    if (searchTerm) params.set('search', searchTerm);
    if (!isGuid && state.orgFilter.size === 1) params.set('org', [...state.orgFilter][0]);
    if (!isGuid && state.appFilter.size === 1) params.set('app', [...state.appFilter][0]);
    if (!isGuid && state.partyFilter.size === 1) params.set('party', [...state.partyFilter][0]);
    if (!isGuid && state.guidFilter.size === 1) params.set('instanceGuid', [...state.guidFilter][0]);
    const cursor = queryPageCursors[page] ?? null;
    if (cursor) params.set('before', cursor);
    if (effectiveCustom) {
      params.set('since', effectiveCustom.from);
      if (page === 0 && !cursor) params.set('before', effectiveCustom.to);
    } else if (effectiveTimeRange > 0) {
      params.set('since', new Date(Date.now() - effectiveTimeRange * 60000).toISOString());
    }
    if (effectiveRetried) params.set('retried', 'true');
    const res = await fetch(`${engineUrl}/dashboard/query?${params}`);
    const body = await res.json();
    /** @type {import('../core/state.js').Workflow[]} */
    let workflows = body.workflows;
    let totalCount = /** @type {number} */ (body.totalCount);

    dom.queryContainer.innerHTML = '';

    // Smart status fallback: if filtered search for a specific GUID returns nothing, retry without filters
    if (workflows.length === 0 && page === 0 && (dbStatus || effectiveRetried) && isGuid) {
      const fallbackRes = await fetch(`${engineUrl}/dashboard/query?limit=${QUERY_PAGE}&search=${encodeURIComponent(searchTerm)}`);
      const fallbackBody = await fallbackRes.json();
      /** @type {import('../core/state.js').Workflow[]} */
      const fallback = fallbackBody.workflows;
      if (fallback.length > 0) {
        const actualStatus = fallback.length === 1 ? fallback[0].status?.toLowerCase() : '';
        if (actualStatus && queryStatusIds.includes(actualStatus)) {
          for (const s of queryStatusIds) {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(`${s}-check`));
            if (el) el.checked = s === actualStatus;
          }
          state.sectionStatus.query = actualStatus;
        } else {
          state.sectionStatus.query = '';
        }
        syncUrl();
        workflows = fallback;
        totalCount = /** @type {number} */ (fallbackBody.totalCount);
      }
    }

    queryPage = page;

    if (workflows.length === 0) {
      dom.queryEmpty.textContent = 'No workflows found';
      dom.queryEmpty.style.display = 'block';
      updatePager(0, 0);
    } else {
      dom.queryEmpty.style.display = 'none';
      for (const wf of workflows) {
        const card = document.createElement('div');
        const forceExpand = state.pendingExpand.delete(wf.idempotencyKey);
        const compact = state.compactSections.query && !forceExpand;
        card.className = `workflow-card${compact ? ' compact' : ''}`;
        card.style.animation = 'none';
        card.innerHTML = compact ? buildCompactCardHTML(wf, true) : buildCardHTML(wf, true);
        setCardFilterData(card, wf);
        dom.queryContainer.appendChild(card);
      }
      if (workflows.length >= QUERY_PAGE) {
        queryPageCursors[page + 1] = workflows[workflows.length - 1].updatedAt ?? null;
      }
      updatePager(workflows.length, totalCount);
      applyFilter();
    }
  } catch (err) {
    dom.queryEmpty.textContent = `Error loading query: ${/** @type {Error} */ (err).message}`;
    dom.queryEmpty.style.display = 'block';
    updatePager(0, 0);
  } finally {
    const elapsed = Date.now() - spinStart;
    const remaining = Math.max(0, 600 - elapsed);
    setTimeout(() => { btn.disabled = false; btn.classList.remove('spinning'); }, remaining);
  }
};

export const loadQuery = () => { queryPage = 0; queryPageCursors = [null]; return fetchQuery({ page: 0 }); };
window.loadQuery = loadQuery;
window.queryPrev = () => { if (queryPage > 0) fetchQuery({ page: queryPage - 1 }); };
window.queryNext = () => fetchQuery({ page: queryPage + 1 });

/* ── Time range dropdown ───────────────────────────────── */

window.toggleTimeDropdown = () => {
  document.getElementById('time-dropdown')?.classList.toggle('open');
};

document.addEventListener('click', (e) => {
  const target = /** @type {HTMLElement} */ (e.target);
  if (!target.closest('.time-range-group')) document.getElementById('time-dropdown')?.classList.remove('open');
  if (!target.closest('.refresh-group')) document.getElementById('refresh-dropdown')?.classList.remove('open');
});

document.getElementById('time-dropdown')?.addEventListener('click', (e) => {
  const opt = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.time-option'));
  if (!opt) return;
  const minutes = opt.dataset.minutes || '0';
  if (minutes === 'custom') {
    document.getElementById('time-custom').style.display = '';
    const now = new Date();
    const from = new Date(now.getTime() - 3600000);
    /** @type {HTMLInputElement} */ (document.getElementById('time-from')).value = toLocalDatetime(from);
    /** @type {HTMLInputElement} */ (document.getElementById('time-to')).value = toLocalDatetime(now);
    return;
  }
  document.getElementById('time-custom').style.display = 'none';
  setCustomTimeRange(null);
  setQueryTimeRange(parseInt(minutes, 10));
  const dropdown = document.getElementById('time-dropdown');
  if (dropdown) for (const o of dropdown.querySelectorAll('.time-option')) o.classList.toggle('active', o === opt);
  dropdown?.classList.remove('open');
  updateTimeLabel();
  syncUrl();
  if (state.queryLoaded) loadQuery();
});

window.applyCustomTimeRange = () => {
  const from = /** @type {HTMLInputElement} */ (document.getElementById('time-from')).value;
  const to = /** @type {HTMLInputElement} */ (document.getElementById('time-to')).value;
  if (!from || !to) return;
  setCustomTimeRange({ from: new Date(from).toISOString(), to: new Date(to).toISOString() });
  setQueryTimeRange(0);
  const dropdown = document.getElementById('time-dropdown');
  if (dropdown) {
    for (const o of dropdown.querySelectorAll('.time-option')) {
      o.classList.toggle('active', (/** @type {HTMLElement} */ (o).dataset.minutes) === 'custom');
    }
  }
  dropdown?.classList.remove('open');
  updateTimeLabel();
  syncUrl();
  if (state.queryLoaded) loadQuery();
};

// Query status checkboxes
const queryStatusIds = ['enqueued', 'processing', 'requeued', 'completed', 'failed', 'canceled'];
window.toggleQueryStatus = () => {
  const checked = queryStatusIds.filter(s => /** @type {HTMLInputElement} */ (document.getElementById(`${s}-check`))?.checked);
  state.sectionStatus.query = checked.length === queryStatusIds.length || checked.length === 0 ? '' : checked.join(',');
  syncUrl();
  if (state.queryLoaded) loadQuery();
};

// Retried checkbox (query only)
window.toggleRetried = () => {
  syncUrl();
  if (state.queryLoaded) loadQuery();
};

// Auto-refresh dropdown
/** @type {number} */
let refreshInterval = 0;
/** @type {ReturnType<typeof setInterval> | null} */
let refreshTimer = null;

window.toggleRefreshDropdown = () => {
  document.getElementById('refresh-dropdown')?.classList.toggle('open');
};

document.getElementById('refresh-dropdown')?.addEventListener('click', (e) => {
  const opt = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.refresh-option'));
  if (!opt) return;
  const seconds = parseInt(opt.dataset.interval || '0', 10);
  refreshInterval = seconds;

  const dropdown = document.getElementById('refresh-dropdown');
  if (dropdown) for (const o of dropdown.querySelectorAll('.refresh-option')) o.classList.toggle('active', o === opt);
  dropdown?.classList.remove('open');

  document.getElementById('refresh-dropdown-btn')?.classList.toggle('active-interval', seconds > 0);
  document.getElementById('query-load')?.classList.toggle('active-interval', seconds > 0);
  const intervalLabel = document.getElementById('refresh-interval-label');
  if (intervalLabel) intervalLabel.textContent = seconds > 0 ? opt.textContent || '' : '';

  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }

  if (seconds > 0 && state.queryLoaded) {
    loadQuery();
    refreshTimer = setInterval(() => { if (state.queryLoaded) loadQuery(); }, seconds * 1000);
  }
});

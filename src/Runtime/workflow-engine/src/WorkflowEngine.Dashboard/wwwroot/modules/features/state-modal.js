/* State trail modal — fetch, render, open/close, SSE-driven refresh */

import { dom, engineUrl } from '../core/state.js';
import { esc, expandJsonStrings, syntaxHighlight } from '../core/helpers.js';

/** Currently open workflow key + createdAt (for refresh) */
let _openWfKey = '';
let _openCreatedAt = '';

/** Debounce timer id */
let _refreshTimer = 0;

/**
 * Build HTML for the state trail.
 * @param {{ initialState: unknown, steps: { operationId: string, processingOrder: number, stateOut: unknown }[], updatedAt: string|null }} data
 * @returns {string}
 */
const buildStateTrailHTML = (data) => {
  let html = '';

  const renderBlock = (/** @type {string} */ label, /** @type {unknown} */ value) => {
    if (value == null) {
      html += `<div class="state-entry">`;
      html += `<div class="state-entry-label">${esc(label)}</div>`;
      html += `<div class="state-entry-empty">No state</div>`;
      html += `</div>`;
      return;
    }
    const expanded = expandJsonStrings(value);
    const isObj = typeof expanded === 'object';
    const display = isObj ? syntaxHighlight(expanded) : esc(String(value));
    html += `<div class="state-entry">`;
    html += `<div class="state-entry-label">${esc(label)}</div>`;
    html += `<div class="pre-wrap"><pre>${display}</pre><button class="pre-copy" onclick="copyPre(event)" title="Copy">&#10697;</button></div>`;
    html += `</div>`;
  };

  renderBlock('Initial State', data.initialState);

  for (const step of data.steps) {
    if (step.stateOut != null) {
      const label = `Step ${step.processingOrder}: ${step.operationId}`;
      renderBlock(label, step.stateOut);
    }
  }

  if (!data.initialState && !data.steps.some(s => s.stateOut != null)) {
    html = '<div class="modal-loading">No state data available</div>';
  }

  return html;
};

/** @param {Event} e */
window.copyPre = async (e) => {
  e.stopPropagation();
  const btn = /** @type {HTMLElement} */ (e.currentTarget);
  const wrap = btn.closest('.pre-wrap');
  const pre = wrap?.querySelector('pre');
  if (!pre) return;
  try {
    await navigator.clipboard.writeText(pre.textContent || '');
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1200);
  } catch { /* ignore */ }
};

/**
 * Fetch and render the state trail.
 * @param {string} wfKey
 * @param {string} [createdAt]
 */
const fetchAndRender = async (wfKey, createdAt) => {
  try {
    let url = `${engineUrl}/dashboard/state?wf=${encodeURIComponent(wfKey)}`;
    if (createdAt) url += `&createdAt=${encodeURIComponent(createdAt)}`;
    const res = await fetch(url);
    if (_openWfKey !== wfKey) return; // modal changed while fetching
    if (!res.ok) throw new Error('State not found');
    const data = await res.json();
    if (_openWfKey !== wfKey) return;
    dom.stateBody.innerHTML = buildStateTrailHTML(data);
  } catch (err) {
    if (_openWfKey !== wfKey) return;
    dom.stateBody.innerHTML = `<div class="modal-loading">${esc(/** @type {Error} */ (err).message)}</div>`;
  }
};

window.openStateModal = async (wfKey, createdAt) => {
  _openWfKey = wfKey;
  _openCreatedAt = createdAt || '';
  dom.stateTitle.textContent = 'State Trail';
  dom.stateBody.innerHTML = '<div class="modal-loading">Loading...</div>';
  dom.stateModal.classList.add('open');
  await fetchAndRender(wfKey, createdAt);
};

window.closeStateModal = () => {
  dom.stateModal.classList.remove('open');
  _openWfKey = '';
  _openCreatedAt = '';
};

/** Called by live.js when a workflow fingerprint changes. Debounced refresh. */
export const notifyWorkflowChanged = (/** @type {string} */ wfKey) => {
  if (!_openWfKey || wfKey !== _openWfKey) return;
  clearTimeout(_refreshTimer);
  _refreshTimer = window.setTimeout(() => fetchAndRender(_openWfKey, _openCreatedAt), 1000);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dom.stateModal.classList.contains('open')) {
    window.closeStateModal();
  }
});

/* Workflow state modal — fetch on open, re-fetch on SSE workflow change */

import { dom, engineUrl } from '../core/state.js';
import { esc, expandJsonStrings, syntaxHighlight, fmtTime, fmtAgo } from '../core/helpers.js';

/** @type {string|null} */
let currentWfKey = null;
/** @type {string|null} */
let currentCreatedAt = null;

/**
 * Fetch and render state into the modal body.
 * @returns {Promise<void>}
 */
const fetchAndRender = async () => {
  if (!currentWfKey) return;
  try {
    let url = `${engineUrl}/dashboard/state?wf=${encodeURIComponent(currentWfKey)}`;
    if (currentCreatedAt) url += `&createdAt=${encodeURIComponent(currentCreatedAt)}`;
    const res = await fetch(url);
    if (!res.ok) {
      dom.stateBody.innerHTML = `<div class="modal-loading">State not available</div>`;
      return;
    }
    const data = await res.json();

    if (data.state != null) {
      let parsed;
      try { parsed = JSON.parse(data.state); } catch { parsed = data.state; }
      dom.stateBody.innerHTML = `<div class="pre-wrap"><pre>${syntaxHighlight(expandJsonStrings(parsed))}</pre><a class="pre-copy" onclick="copyPre(event)" title="Copy">&#10697;</a></div>`;
    } else {
      dom.stateBody.innerHTML = `<div class="modal-loading">No state</div>`;
    }
    if (data.updatedAt) {
      const abs = fmtTime(data.updatedAt);
      const rel = fmtAgo(data.updatedAt);
      dom.stateUpdated.textContent = rel ? `${abs} (${rel})` : abs || '';
    } else {
      dom.stateUpdated.textContent = '';
    }
  } catch (err) {
    dom.stateBody.innerHTML = `<div class="modal-loading">${esc(/** @type {Error} */ (err).message)}</div>`;
  }
};

/** @type {number|null} */
let debounceTimer = null;

/**
 * Called by live.js when a workflow's fingerprint changes.
 * Re-fetches state if the changed workflow is the one currently open.
 * Debounced to avoid request pile-up when steps change rapidly.
 * @param {string} wfKey
 */
export const notifyWorkflowChanged = (wfKey) => {
  if (currentWfKey === wfKey && dom.stateModal.classList.contains('open')) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { debounceTimer = null; fetchAndRender(); }, 1000);
  }
};

window.openStateModal = async (wfKey, createdAt) => {
  currentWfKey = wfKey;
  currentCreatedAt = createdAt || null;
  dom.stateBody.innerHTML = '<div class="modal-loading">Loading...</div>';
  dom.stateUpdated.textContent = '';
  dom.stateModal.classList.add('open');
  await fetchAndRender();
};

window.closeStateModal = () => {
  dom.stateModal.classList.remove('open');
  currentWfKey = null;
  currentCreatedAt = null;
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dom.stateModal.classList.contains('open')) {
    window.closeStateModal();
  }
});

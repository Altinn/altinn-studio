/* State trail modal — fetch, render, open/close, SSE-driven refresh */

import { dom } from '../core/state.js';
import { esc, expandJsonStrings, syntaxHighlight } from '../core/helpers.js';

/** Currently open workflow databaseId (for refresh) */
let _openWfId = '';

/** Currently open workflow namespace (for refresh) */
let _openWfNamespace = '';

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

    if (!data.initialState && !data.steps.some((s) => s.stateOut != null)) {
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
    } catch {
        /* ignore */
    }
};

/**
 * Fetch and render the state trail.
 * @param {string} wfId - workflow databaseId
 */
const fetchAndRender = async (wfId, wfNamespace) => {
    try {
        const url = `/dashboard/state?wf=${encodeURIComponent(wfId)}&ns=${encodeURIComponent(wfNamespace)}`;
        const res = await fetch(url);
        if (_openWfId !== wfId) return; // modal changed while fetching
        if (!res.ok) throw new Error('State not found');
        const data = await res.json();
        if (_openWfId !== wfId) return;
        dom.stateBody.innerHTML = buildStateTrailHTML(data);
    } catch (err) {
        if (_openWfId !== wfId) return;
        dom.stateBody.innerHTML = `<div class="modal-loading">${esc(/** @type {Error} */ (err).message)}</div>`;
    }
};

window.openStateModal = async (wfId, wfNamespace) => {
    _openWfId = wfId;
    _openWfNamespace = wfNamespace;
    dom.stateTitle.textContent = 'State Trail';
    dom.stateBody.innerHTML = '<div class="modal-loading">Loading...</div>';
    dom.stateModal.classList.add('open');
    await fetchAndRender(wfId, wfNamespace);
};

window.closeStateModal = () => {
    dom.stateModal.classList.remove('open');
    _openWfId = '';
    _openWfNamespace = '';
};

/** Called by live.js when a workflow fingerprint changes. Debounced refresh. */
export const notifyWorkflowChanged = (/** @type {string} */ wfId) => {
    if (!_openWfId || wfId !== _openWfId) return;
    clearTimeout(_refreshTimer);
    _refreshTimer = window.setTimeout(() => fetchAndRender(_openWfId, _openWfNamespace), 1000);
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.stateModal.classList.contains('open')) {
        window.closeStateModal();
    }
});

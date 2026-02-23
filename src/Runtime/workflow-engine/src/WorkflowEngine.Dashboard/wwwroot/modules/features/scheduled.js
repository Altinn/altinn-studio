/* Scheduled workflows — count badge + on-demand detail */

import { dom, state, engineUrl, workflowData, parseTransition } from '../core/state.js';
import { esc } from '../core/helpers.js';
import { buildPipelineHTML } from '../shared/pipeline.js';
import { copyIconHTML, openIconHTML } from '../shared/cards.js';
import { stepSubLabel } from '../core/state.js';

/** Late-bound references */
/** @type {() => void} */
let _applyFilter = () => {};
/** @type {() => void} */
let _syncUrl = () => {};

/** @param {{ applyFilter: () => void, syncUrl: () => void }} fns */
export const bindScheduledCallbacks = (fns) => {
  _applyFilter = fns.applyFilter;
  _syncUrl = fns.syncUrl;
};

let lastScheduledCount = -1;

/** @param {number} count */
export const updateScheduledBadge = (count) => {
  if (count !== lastScheduledCount) {
    lastScheduledCount = count;
    loadScheduled();
  }
};

export const loadScheduled = async () => {
  if (dom.scheduledSection.classList.contains('collapsed')) return;

  try {
    const res = await fetch(`${engineUrl}/dashboard/scheduled`);
    /** @type {import('../core/state.js').Workflow[]} */
    const workflows = await res.json();

    dom.scheduledContainer.innerHTML = '';
    if (workflows.length === 0) {
      dom.scheduledContainer.innerHTML = '<div class="empty-state">No scheduled workflows</div>';
      return;
    }
    for (const wf of workflows) {
      const card = document.createElement('div');
      card.className = `workflow-card${state.compactSections.scheduled ? ' compact' : ''}`;
      card.style.animation = 'none';
      card.dataset.wfkey = wf.idempotencyKey;
      workflowData[wf.idempotencyKey] = wf;
      const msUntil = wf.startAt ? new Date(wf.startAt).getTime() - Date.now() : Infinity;
      card.dataset.status = msUntil < 10000 ? '10s' : msUntil < 60000 ? '1m' : msUntil < 300000 ? '5m' : 'later';
      card.innerHTML = state.compactSections.scheduled ? buildCompactScheduledCardHTML(wf) : buildScheduledCardHTML(wf);
      dom.scheduledContainer.appendChild(card);
    }
    _applyFilter();
  } catch { /* non-critical */ }
};

/** @param {string} sectionId */
window.toggleSection = (sectionId) => {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.classList.toggle('collapsed');
  const collapsed = section.classList.contains('collapsed');
  try { localStorage.setItem(`section:${sectionId}`, collapsed ? '1' : '0'); } catch { /* ignore */ }
  _syncUrl();
  if (sectionId === 'scheduled-section' && !collapsed) loadScheduled();
};

// Restore saved collapse states
for (const id of ['scheduled-section', 'live-section', 'recent-section']) {
  try {
    const saved = localStorage.getItem(`section:${id}`);
    if (saved !== null) {
      document.getElementById(id)?.classList.toggle('collapsed', saved === '1');
    }
  } catch { /* ignore */ }
}

/**
 * @param {import('../core/state.js').Workflow} wf
 * @returns {string}
 */
export const buildScheduledCardHTML = (wf) => {
  const { instance: inst } = wf;
  const tx = parseTransition(wf);
  const wfLabel = tx ? `${tx.from || 'Start Event'} \u2192 ${tx.to}` : wf.operationId;
  let html = `<div class="card-header">`;
  html += `<span class="seg">${esc(inst.org)}</span>`;
  html += `<span class="seg-sep">/</span>`;
  html += `<span class="seg">${esc(inst.app)}</span>`;
  html += `<span class="seg-sep">/</span>`;
  html += `<span class="seg">${inst.instanceOwnerPartyId}</span>`;
  html += `<span class="seg-sep">/</span>`;
  html += `<span class="seg guid">${esc(inst.instanceGuid)}</span>`;
  html += `<span class="wf-name">${esc(wfLabel)}</span>`;
  html += `<span class="header-spacer"></span>`;
  if (wf.startAt) {
    html += `<span class="elapsed" data-starts-at="${esc(wf.startAt)}"></span>`;
  }
  html += `<span class="status-pill scheduled" style="animation:none">Scheduled</span>`;
  html += copyIconHTML(inst.instanceGuid);
  html += openIconHTML(inst);
  html += `</div>`;
  html += buildPipelineHTML(wf, true);
  return html;
};

/**
 * Compact scheduled card variant.
 * @param {import('../core/state.js').Workflow} wf
 * @returns {string}
 */
export const buildCompactScheduledCardHTML = (wf) => {
  const { instance: inst } = wf;
  const tx = parseTransition(wf);
  const wfLabel = tx ? `${tx.from || 'Start Event'} \u2192 ${tx.to}` : wf.operationId;
  let html = `<div class="compact-row">`;
  html += `<span class="seg">${esc(inst.org)}</span>`;
  html += `<span class="seg-sep">/</span>`;
  html += `<span class="seg">${esc(inst.app)}</span>`;
  html += `<span class="seg-sep">/</span>`;
  html += `<span class="seg">${inst.instanceOwnerPartyId}</span>`;
  html += `<span class="seg-sep">/</span>`;
  html += `<span class="seg guid">${esc(inst.instanceGuid)}</span>`;
  html += `<span class="compact-name">${esc(wfLabel)}</span>`;
  html += `<div class="compact-pipeline">`;
  for (const step of wf.steps) {
    html += `<span class="compact-dot ${step.status}" title="${esc(step.commandDetail)} (${step.status})"></span>`;
  }
  html += `</div>`;
  if (wf.startAt) {
    html += `<span class="elapsed" data-starts-at="${esc(wf.startAt)}"></span>`;
  }
  html += `<span class="status-pill scheduled compact-pill" style="animation:none">Scheduled</span>`;
  html += copyIconHTML(inst.instanceGuid);
  html += openIconHTML(inst);
  html += `</div>`;
  return html;
};

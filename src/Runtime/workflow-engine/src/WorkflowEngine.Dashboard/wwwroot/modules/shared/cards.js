/* Card rendering — shared by live, recent, and query views */

import { parseTransition, stepSubLabel, state, workflowData, engineUrl } from '../core/state.js';
import { cssId, esc, formatElapsed, fmtTime } from '../core/helpers.js';
import { buildPipelineHTML, scrollPipelineToActive } from './pipeline.js';

/** @param {string} guid */
export const copyIconHTML = (guid) =>
  `<a class="open-btn" onclick="copyGuid(event,'${esc(guid)}')" title="Copy instance GUID">&#10697;</a>`;

/** @param {import('../core/state.js').InstanceInfo} inst */
export const openIconHTML = (inst) => {
  const url = `http://local.altinn.cloud/${esc(inst.org)}/${esc(inst.app)}/#/instance/${inst.instanceOwnerPartyId}/${esc(inst.instanceGuid)}`;
  return `<a class="open-btn" href="${url}" target="_blank" onclick="event.stopPropagation()" title="Open instance">&#8599;</a>`;
};

/** @param {string} traceId @param {string} [title] @param {string} [extraClass] @returns {string} */
export const traceLink = (traceId, title, extraClass) => {
  const panes = JSON.stringify({t:{datasource:"tempo",queries:[{refId:"traceId",queryType:"traceql",query:traceId,datasource:{type:"tempo",uid:"tempo"},limit:20,tableType:"traces"}],range:{from:"now-1h",to:"now"}}});
  const url = 'http://localhost:7070/explore?schemaVersion=1&panes=' + encodeURIComponent(panes) + '&orgId=1';
  return `<a class="open-btn grafana-btn${extraClass ? ' ' + extraClass : ''}" href="${url}" target="_blank" onclick="event.stopPropagation()" title="${title || 'View trace in Grafana'}"><svg viewBox="0 0 351 365" fill="currentColor"><path d="M342,161.2c-.6-6.1-1.6-13.1-3.6-20.9-2-7.7-5-16.2-9.4-25-4.4-8.8-10.1-17.9-17.5-26.8-2.9-3.5-6.1-6.9-9.5-10.2 5.1-20.3-6.2-37.9-6.2-37.9-19.5-1.2-31.9 6.1-36.5 9.4-.8-.3-1.5-.7-2.3-1-3.3-1.3-6.7-2.6-10.3-3.7-3.5-1.1-7.1-2.1-10.8-3-3.7-.9-7.4-1.6-11.2-2.2-.7-.1-1.3-.2-2-.3-8.5-27.2-32.9-38.6-32.9-38.6-27.3 17.3-32.4 41.5-32.4 41.5s-.1.5-.3 1.4c-1.5.4-3 .9-4.5 1.3-2.1.6-4.2 1.4-6.2 2.2-2.1.8-4.1 1.6-6.2 2.5-4.1 1.8-8.2 3.8-12.2 6-3.9 2.2-7.7 4.6-11.4 7.1-.5-.2-1-.4-1-.4-37.8-14.4-71.3 2.9-71.3 2.9-3.1 40.2 15.1 65.5 18.7 70.1-.9 2.5-1.7 5-2.5 7.5-2.8 9.1-4.9 18.4-6.2 28.1-.2 1.4-.4 2.8-.5 4.2C18.8 192.7 8.5 228 8.5 228c29.1 33.5 63.1 35.6 63.1 35.6 0 0 .1-.1.1-.1 4.3 7.7 9.3 15 14.9 21.9 2.4 2.9 4.8 5.6 7.4 8.3-10.6 30.4 1.5 55.6 1.5 55.6 32.4 1.2 53.7-14.2 58.2-17.7 3.2 1.1 6.5 2.1 9.8 2.9 10 2.6 20.2 4.1 30.4 4.5 2.5.1 5.1.2 7.6.1l1.2 0 .8 0 1.6 0 1.6-.1 0 .1c15.3 21.8 42.1 24.9 42.1 24.9 19.1-20.1 20.2-40.1 20.2-44.4l0 0c0 0 0-.1 0-.3 0-.4 0-.6 0-.6l0 0c0-.3 0-.6 0-.9 4-2.8 7.8-5.8 11.4-9.1 7.6-6.9 14.3-14.8 19.9-23.3.5-.8 1-1.6 1.5-2.4 21.6 1.2 36.9-13.4 36.9-13.4-3.6-22.5-16.4-33.5-19.1-35.6l0 0c0 0-.1-.1-.3-.2-.2-.1-.2-.2-.2-.2 0 0 0 0 0 0-.1-.1-.3-.2-.5-.3.1-1.4.2-2.7.3-4.1.2-2.4.2-4.9.2-7.3l0-1.8 0-.9 0-.5c0-.6 0-.4 0-.6l-.1-1.5-.1-2c0-.7-.1-1.3-.2-1.9-.1-.6-.1-1.3-.2-1.9l-.2-1.9-.3-1.9c-.4-2.5-.8-4.9-1.4-7.4-2.3-9.7-6.1-18.9-11-27.2-5-8.3-11.2-15.6-18.3-21.8-7-6.2-14.9-11.2-23.1-14.9-8.3-3.7-16.9-6.1-25.5-7.2-4.3-.6-8.6-.8-12.9-.7l-1.6 0-.4 0c-.1 0-.6 0-.5 0l-.7 0-1.6.1c-.6 0-1.2.1-1.7.1-2.2.2-4.4.5-6.5.9-8.6 1.6-16.7 4.7-23.8 9-7.1 4.3-13.3 9.6-18.3 15.6-5 6-8.9 12.7-11.6 19.6-2.7 6.9-4.2 14.1-4.6 21-.1 1.7-.1 3.5-.1 5.2 0 .4 0 .9 0 1.3l.1 1.4c.1.8.1 1.7.2 2.5.3 3.5 1 6.9 1.9 10.1 1.9 6.5 4.9 12.4 8.6 17.4 3.7 5 8.2 9.1 12.9 12.4 4.7 3.2 9.8 5.5 14.8 7 5 1.5 10 2.1 14.7 2.1.6 0 1.2 0 1.7 0 .3 0 .6 0 .9 0 .3 0 .6 0 .9-.1.5 0 1-.1 1.5-.1.1 0 .3 0 .4-.1l.5-.1c.3 0 .6-.1.9-.1.6-.1 1.1-.2 1.7-.3.6-.1 1.1-.2 1.6-.4 1.1-.2 2.1-.6 3.1-.9 2-.7 4-1.5 5.7-2.4 1.8-.9 3.4-2 5-3 .4-.3.9-.6 1.3-1 1.6-1.3 1.9-3.7.6-5.3-1.1-1.4-3.1-1.8-4.7-.9-.4.2-.8.4-1.2.6-1.4.7-2.8 1.3-4.3 1.8-1.5.5-3.1.9-4.7 1.2-.8.1-1.6.2-2.5.3-.4 0-.8.1-1.3.1-.4 0-.9 0-1.2 0-.4 0-.8 0-1.2 0-.5 0-1 0-1.5-.1 0 0-.3 0-.1 0l-.2 0-.3 0c-.2 0-.5 0-.7-.1-.5-.1-.9-.1-1.4-.2-3.7-.5-7.4-1.6-10.9-3.2-3.6-1.6-7-3.8-10.1-6.6-3.1-2.8-5.8-6.1-7.9-9.9-2.1-3.8-3.6-8-4.3-12.4-.3-2.2-.5-4.5-.4-6.7 0-.6.1-1.2.1-1.8 0 .2 0-.1 0-.1l0-.2 0-.5c0-.3.1-.6.1-.9.1-1.2.3-2.4.5-3.6 1.7-9.6 6.5-19 13.9-26.1 1.9-1.8 3.9-3.4 6-4.9 2.1-1.5 4.4-2.8 6.8-3.9 2.4-1.1 4.8-2 7.4-2.7 2.5-.7 5.1-1.1 7.8-1.4 1.3-.1 2.6-.2 4-.2.4 0 .6 0 .9 0l1.1 0 .7 0c.3 0 0 0 .1 0l.3 0 1.1.1c2.9.2 5.7.6 8.5 1.3 5.6 1.2 11.1 3.3 16.2 6.1 10.2 5.7 18.9 14.5 24.2 25.1 2.7 5.3 4.6 11 5.5 16.9.2 1.5.4 3 .5 4.5l.1 1.1.1 1.1c0 .4 0 .8 0 1.1 0 .4 0 .8 0 1.1l0 1 0 1.1c0 .7-.1 1.9-.1 2.6-.1 1.6-.3 3.3-.5 4.9-.2 1.6-.5 3.2-.8 4.8-.3 1.6-.7 3.2-1.1 4.7-.8 3.1-1.8 6.2-3 9.3-2.4 6-5.6 11.8-9.4 17.1-7.7 10.6-18.2 19.2-30.2 24.7-6 2.7-12.3 4.7-18.8 5.7-3.2.6-6.5.9-9.8 1l-.6 0-.5 0-1.1 0-1.6 0-.8 0c.4 0-.1 0-.1 0l-.3 0c-1.8 0-3.5-.1-5.3-.3-7-.5-13.9-1.8-20.7-3.7-6.7-1.9-13.2-4.6-19.4-7.8-12.3-6.6-23.4-15.6-32-26.5-4.3-5.4-8.1-11.3-11.2-17.4-3.1-6.1-5.6-12.6-7.4-19.1-1.8-6.6-2.9-13.3-3.4-20.1l-.1-1.3 0-.3 0-.3 0-.6 0-1.1 0-.3 0-.4 0-.8 0-1.6 0-.3c0 0 0 .1 0-.1l0-.6c0-.8 0-1.7 0-2.5.1-3.3.4-6.8.8-10.2.4-3.4 1-6.9 1.7-10.3.7-3.4 1.5-6.8 2.5-10.2 1.9-6.7 4.3-13.2 7.1-19.3 5.7-12.2 13.1-23.1 22-31.8 2.2-2.2 4.5-4.2 6.9-6.2 2.4-1.9 4.9-3.7 7.5-5.4 2.5-1.7 5.2-3.2 7.9-4.6 1.3-.7 2.7-1.4 4.1-2 .7-.3 1.4-.6 2.1-.9.7-.3 1.4-.6 2.1-.9 2.8-1.2 5.7-2.2 8.7-3.1.7-.2 1.5-.4 2.2-.7.7-.2 1.5-.4 2.2-.6 1.5-.4 3-.8 4.5-1.1.7-.2 1.5-.3 2.3-.5.8-.2 1.5-.3 2.3-.5.8-.1 1.5-.3 2.3-.4l1.1-.2 1.2-.2c.8-.1 1.5-.2 2.3-.3.9-.1 1.7-.2 2.6-.3.7-.1 1.9-.2 2.6-.3.5-.1 1.1-.1 1.6-.2l1.1-.1.5-.1.6 0c.9-.1 1.7-.1 2.6-.2l1.3-.1c0 0 .5 0 .1 0l.3 0 .6 0c.7 0 1.5-.1 2.2-.1 2.9-.1 5.9-.1 8.8 0 5.8.2 11.5.9 17 1.9 11.1 2.1 21.5 5.6 31 10.3 9.5 4.6 17.9 10.3 25.3 16.5.5.4.9.8 1.4 1.2.4.4.9.8 1.3 1.2.9.8 1.7 1.6 2.6 2.4.9.8 1.7 1.6 2.5 2.4.8.8 1.6 1.6 2.4 2.5 3.1 3.3 6 6.6 8.6 10 5.2 6.7 9.4 13.5 12.7 19.9.2.4.4.8.6 1.2.2.4.4.8.6 1.2.4.8.8 1.6 1.1 2.4.4.8.7 1.5 1.1 2.3.3.8.7 1.5 1 2.3 1.2 3 2.4 5.9 3.3 8.6 1.5 4.4 2.6 8.3 3.5 11.7.3 1.4 1.6 2.3 3 2.1 1.5-.1 2.6-1.3 2.6-2.8C342.6 170.4 342.5 166.1 342 161.2z"/></svg></a>`;
};

/** @param {string} traceId @returns {string} */
export const traceIconHTML = (traceId) => traceLink(traceId, 'Engine trace in Grafana');

/** @param {import('../core/state.js').Workflow} wf @returns {string} */
export const stateIconHTML = (wf) =>
  `<a class="open-btn state-btn" onclick="openStateModal('${esc(wf.idempotencyKey)}','${esc(wf.createdAt)}')" title="View state trail">&#123;&#125;</a>`;

/** @param {Event} e @param {string} guid */
window.copyGuid = async (e, guid) => {
  e.stopPropagation();
  try {
    await navigator.clipboard.writeText(guid);
    const btn = /** @type {HTMLElement} */ (e.currentTarget);
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1200);
  } catch { /* ignore */ }
};

/** @param {Event} e @param {string} idempotencyKey @param {string} createdAt */
window.retryWorkflow = async (e, idempotencyKey, createdAt) => {
  e.stopPropagation();
  const btn = /** @type {HTMLElement} */ (e.currentTarget);
  if (btn.classList.contains('retrying')) return;
  btn.classList.add('retrying');
  btn.innerHTML = '&#8987; Retrying';
  try {
    const url = `${engineUrl}/dashboard/retry?wf=${encodeURIComponent(idempotencyKey)}&createdAt=${encodeURIComponent(createdAt)}`;
    const resp = await fetch(url, { method: 'POST' });
    if (resp.ok) {
      btn.classList.remove('retrying');
      btn.classList.add('retried');
      btn.innerHTML = '&#10003; Queued';
      // Remove the card from Recent/Query DOM so it doesn't linger as "Failed"
      const card = btn.closest('.workflow-card');
      if (card) {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.97)';
        setTimeout(() => {
          card.remove();
          // Purge from recent key tracking so SSE doesn't think it's still rendered
          state.lastRecentKeys = state.lastRecentKeys.split(',').filter(k => k !== idempotencyKey).join(',');
        }, 400);
      }
    } else {
      const err = await resp.text();
      btn.classList.remove('retrying');
      btn.classList.add('retry-failed');
      btn.innerHTML = '&#10007; Failed';
      setTimeout(() => { btn.classList.remove('retry-failed'); btn.innerHTML = '&#8635; Retry'; }, 3000);
    }
  } catch (ex) {
    btn.classList.remove('retrying');
    btn.classList.add('retry-failed');
    btn.innerHTML = '&#10007; Failed';
    setTimeout(() => { btn.classList.remove('retry-failed'); btn.innerHTML = '&#8635; Retry'; }, 3000);
  }
};

/** @param {Event} e @param {string} wfKey @param {string} stepKey */
window.skipBackoff = async (e, wfKey, stepKey) => {
  e.stopPropagation();
  const btn = /** @type {HTMLElement} */ (e.currentTarget);
  if (btn.classList.contains('retrying')) return;
  btn.classList.add('retrying');
  btn.innerHTML = '&#8987; Skipping';
  try {
    const url = `${engineUrl}/dashboard/skip-backoff?wf=${encodeURIComponent(wfKey)}&step=${encodeURIComponent(stepKey)}`;
    const resp = await fetch(url, { method: 'POST' });
    if (resp.ok) {
      btn.classList.remove('retrying');
      btn.classList.add('retried');
      btn.innerHTML = '&#10003; Skipped';
    } else {
      btn.classList.remove('retrying');
      btn.classList.add('retry-failed');
      btn.innerHTML = '&#10007; Failed';
      setTimeout(() => { btn.classList.remove('retry-failed'); btn.innerHTML = '&#9654; Retry now'; }, 3000);
    }
  } catch (ex) {
    btn.classList.remove('retrying');
    btn.classList.add('retry-failed');
    btn.innerHTML = '&#10007; Failed';
    setTimeout(() => { btn.classList.remove('retry-failed'); btn.innerHTML = '&#9654; Retry now'; }, 3000);
  }
};

/**
 * Build the inline timestamps + elapsed block (createdAt → removedAt  elapsed).
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} [isStatic]
 * @returns {string}
 */
const buildTimestampsHTML = (wf, isStatic) => {
  let html = '';
  const startTs = fmtTime(wf.createdAt);
  if (startTs) {
    html += `<span class="timestamp" data-iso="${esc(wf.createdAt)}">${esc(startTs)}</span>`;
  }
  const endIso = wf.removedAt || wf.steps.at(-1)?.updatedAt;
  if (endIso && (isStatic || wf.removedAt)) {
    const endTs = fmtTime(endIso);
    if (endTs) {
      html += `<span class="ts-arrow">\u2192</span>`;
      html += `<span class="timestamp" data-iso="${esc(endIso)}">${esc(endTs)}</span>`;
    }
  } else if (startTs) {
    html += `<span class="ts-arrow ts-placeholder">\u2192</span>`;
    html += `<span class="timestamp ts-placeholder">&nbsp;</span>`;
  }
  if (!isStatic) {
    html += `<span class="elapsed" data-timer="${esc(wf.idempotencyKey)}">0.0s</span>`;
  } else {
    const durStart = wf.executionStartedAt || wf.createdAt;
    const durEnd = wf.removedAt || wf.steps.at(-1)?.updatedAt;
    if (durStart && durEnd) {
      const dur = (new Date(durEnd) - new Date(durStart)) / 1000;
      const label = dur < 1 ? `${(dur * 1000).toFixed(0)}ms` : formatElapsed(dur);
      html += `<span class="elapsed">${label}</span>`;
    }
  }
  return html;
};

/* ── Segment rows (org/app/party/guid) ───────────────────── */

/**
 * Build the org/app/party/guid segment row.
 * @param {import('../core/state.js').InstanceInfo} inst
 * @param {boolean} interactive - true adds onclick filter handlers
 * @returns {string}
 */
const buildSegmentsHTML = (inst, interactive) => {
  if (interactive) {
    return `<span class="seg" onclick="toggleOrgFilter('${esc(inst.org)}')" title="Filter by org">${esc(inst.org)}</span>`
      + `<span class="seg-sep">/</span>`
      + `<span class="seg" onclick="toggleAppFilter('${esc(inst.app)}')" title="Filter by app">${esc(inst.app)}</span>`
      + `<span class="seg-sep">/</span>`
      + `<span class="seg" onclick="togglePartyFilter('${inst.instanceOwnerPartyId}')" title="Filter by party">${inst.instanceOwnerPartyId}</span>`
      + `<span class="seg-sep">/</span>`
      + `<span class="seg guid" onclick="toggleGuidFilter('${esc(inst.instanceGuid)}')" title="Filter by instance">${esc(inst.instanceGuid)}</span>`;
  }
  return `<span class="seg">${esc(inst.org)}</span>`
    + `<span class="seg-sep">/</span>`
    + `<span class="seg">${esc(inst.app)}</span>`
    + `<span class="seg-sep">/</span>`
    + `<span class="seg">${inst.instanceOwnerPartyId}</span>`
    + `<span class="seg-sep">/</span>`
    + `<span class="seg guid">${esc(inst.instanceGuid)}</span>`;
};

/**
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} [isStatic]
 * @returns {string}
 */
export const buildCardHTML = (wf, isStatic) => {
  const { instance: inst } = wf;
  const retries = wf.steps.reduce((sum, s) => sum + s.retryCount, 0);
  const tx = parseTransition(wf);
  const wfLabel = tx ? `${wf.operationId}: ${tx.from || 'Start Event'} \u2192 ${tx.to}` : wf.operationId;

  let html = `<div class="card-header">`;
  html += buildSegmentsHTML(inst, true);
  html += `<span class="wf-name">${esc(wfLabel)}</span>`;
  html += `<span class="header-spacer"></span>`;
  if (retries > 0) html += `<span class="retry-badge">&#8635;${retries}</span>`;
  html += `<span class="status-pill ${wf.status}"${isStatic ? ' style="animation:none"' : ''}>${wf.status}</span>`;
  html += buildTimestampsHTML(wf, isStatic);
  html += copyIconHTML(inst.instanceGuid);
  html += openIconHTML(inst);
  if (wf.hasState) html += stateIconHTML(wf);
  if (wf.traceId) html += traceIconHTML(wf.traceId);
  html += `</div>`;

  html += buildPipelineHTML(wf, isStatic);
  return html;
};

/**
 * Compact card: single row with tiny step dots, no labels/connectors.
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} [isStatic]
 * @returns {string}
 */
export const buildCompactCardHTML = (wf, isStatic) => {
  const { instance: inst } = wf;
  const retries = wf.steps.reduce((sum, s) => sum + s.retryCount, 0);
  const tx = parseTransition(wf);
  const wfLabel = tx ? `${wf.operationId}: ${tx.from || 'Start Event'} \u2192 ${tx.to}` : wf.operationId;

  let html = `<div class="compact-row">`;
  html += buildSegmentsHTML(inst, true);
  html += `<span class="compact-name">${esc(wfLabel)}</span>`;

  html += `<div class="compact-pipeline">`;
  for (const step of wf.steps) {
    const sub = stepSubLabel(step);
    const dotTitle = sub ? `${step.commandDetail} [${sub}] (${step.status})` : `${step.commandDetail} (${step.status})`;
    html += `<span class="compact-dot ${step.status}" onclick="openStepModal('${esc(wf.idempotencyKey)}','${esc(step.idempotencyKey)}','${esc(step.commandDetail)}','${esc(wf.createdAt)}')" title="${esc(dotTitle)}"></span>`;
  }
  html += `</div>`;

  if (retries > 0) html += `<span class="retry-badge">&#8635;${retries}</span>`;
  html += `<span class="status-pill ${wf.status} compact-pill">${wf.status}</span>`;
  html += buildTimestampsHTML(wf, isStatic);
  html += copyIconHTML(inst.instanceGuid);
  html += openIconHTML(inst);
  if (wf.hasState) html += stateIconHTML(wf);
  if (wf.traceId) html += traceIconHTML(wf.traceId);
  html += `</div>`;
  return html;
};

/* ── Scheduled card variants ──────────────────────────────── */

/**
 * @param {import('../core/state.js').Workflow} wf
 * @returns {string}
 */
export const buildScheduledCardHTML = (wf) => {
  const { instance: inst } = wf;
  const tx = parseTransition(wf);
  const wfLabel = tx ? `${tx.from || 'Start Event'} \u2192 ${tx.to}` : wf.operationId;
  let html = `<div class="card-header">`;
  html += buildSegmentsHTML(inst, false);
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
  html += buildSegmentsHTML(inst, false);
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

/**
 * @param {import('../core/state.js').Workflow} wf
 * @param {string} elId
 * @returns {HTMLDivElement}
 */
export const createWorkflowCard = (wf, elId) => {
  const card = document.createElement('div');
  const forceExpand = state.pendingExpand.delete(wf.idempotencyKey);
  const compact = state.compactSections.inbox && !forceExpand;
  card.className = `workflow-card${compact ? ' compact' : ''}`;
  card.id = elId;
  card.innerHTML = compact ? buildCompactCardHTML(wf) : buildCardHTML(wf);
  setCardFilterData(card, wf);
  if (!compact) requestAnimationFrame(() => scrollPipelineToActive(card));
  return card;
};

/* ── Card filter data ───────────────────────────────────── */

/** @param {import('../core/state.js').Workflow} wf @returns {string} */
const buildFilterText = (wf) => {
  const parts = [wf.instance.org, wf.instance.app, wf.instance.instanceOwnerPartyId, wf.instance.instanceGuid, wf.operationId];
  for (const s of wf.steps) parts.push(s.commandDetail, s.operationId);
  return parts.join(' ').toLowerCase();
};

/** @param {import('../core/state.js').Workflow} wf @returns {string} */
const buildStatusTags = (wf) => {
  const tags = new Set();
  tags.add(wf.status.toLowerCase());
  for (const s of wf.steps) {
    const st = s.status.toLowerCase();
    tags.add(st);
    if (st === 'requeued' || s.retryCount > 0) tags.add('retrying');
  }
  return [...tags].join(' ');
};

/** @param {HTMLElement} card @param {import('../core/state.js').Workflow} wf */
export const setCardFilterData = (card, wf) => {
  card.dataset.wfkey = wf.idempotencyKey;
  workflowData[wf.idempotencyKey] = wf;
  card.dataset.filter = buildFilterText(wf);
  card.dataset.status = buildStatusTags(wf);
  card.dataset.org = wf.instance.org.toLowerCase();
  card.dataset.app = wf.instance.app.toLowerCase();
  card.dataset.party = String(wf.instance.instanceOwnerPartyId);
  card.dataset.guid = wf.instance.instanceGuid.toLowerCase();
};

/* Step detail modal — fetch, render, open/close */

import { dom, engineUrl } from '../core/state.js';
import { esc, expandJsonStrings, syntaxHighlight, fmtTime, fmtDuration, fmtAgo } from '../core/helpers.js';

/**
 * Build structured HTML for a step detail modal.
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
const buildStepDetailHTML = (data) => {
  let html = '';

  const row = (/** @type {string} */ label, /** @type {unknown} */ val) => {
    if (val == null) return '';
    return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${esc(String(val))}</span></div>`;
  };

  const timeRow = (/** @type {string} */ label, /** @type {string|null|undefined} */ raw) => {
    if (!raw) return '';
    const abs = fmtTime(raw);
    const rel = fmtAgo(raw);
    const suffix = rel ? `<span class="detail-ago">${esc(rel)}</span>` : '';
    return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value"><span class="timestamp" data-iso="${esc(raw)}">${esc(abs || '')}</span>${suffix}</span></div>`;
  };

  const status = /** @type {string} */ (data.status) || '';
  const isFailing = status === 'Failed' || status === 'Requeued';

  if (data.lastError) {
    html += `<div class="modal-error">${esc(/** @type {string} */ (data.lastError))}</div>`;
  } else if (isFailing) {
    html += `<div class="modal-error-hint">Error details are not persisted to the database. Available in Inbox and Recent views only.</div>`;
  }
  if (data.idempotencyKey && isFailing) {
    const lokiQuery = `{service_name="WorkflowEngine"} |= \`${data.idempotencyKey}\``;
    const panes = JSON.stringify({l:{datasource:"loki",queries:[{refId:"logs",expr:lokiQuery,datasource:{type:"loki",uid:"loki"}}],range:{from:"now-1h",to:"now"}}});
    const lokiUrl = 'http://localhost:7070/explore?schemaVersion=1&panes=' + encodeURIComponent(panes) + '&orgId=1';
    html += `<a class="modal-grafana-link" href="${lokiUrl}" target="_blank">View error logs in Grafana</a>`;
  }

  html += `<div class="detail-row"><span class="detail-label">Status</span><span class="status-pill ${status}">${esc(status)}</span></div>`;
  html += row('Idempotency Key', data.idempotencyKey);

  const actor = /** @type {Record<string, unknown>|null} */ (data.actor);
  if (actor) {
    const actorLabel = actor.language
      ? `${actor.userIdOrOrgNumber} (${actor.language})`
      : String(actor.userIdOrOrgNumber);
    html += row('Actor', actorLabel);
  }
  html += timeRow('Created', /** @type {string} */ (data.createdAt));
  html += timeRow('Execution Started', /** @type {string} */ (data.executionStartedAt));
  html += timeRow('Last Updated', /** @type {string} */ (data.updatedAt));
  html += timeRow('Backoff Until', /** @type {string} */ (data.backoffUntil));

  if (data.retryCount || data.retryStrategy) {
    html += '<div class="detail-section">Retry</div>';
    html += row('Retry Count', data.retryCount);
    const rs = /** @type {Record<string, unknown>|null} */ (data.retryStrategy);
    if (rs) {
      html += row('Backoff Type', rs.backoffType);
      html += row('Base Interval', fmtDuration(/** @type {string} */ (rs.baseInterval)));
      html += row('Max Retries', rs.maxRetries);
      html += row('Max Delay', fmtDuration(/** @type {string} */ (rs.maxDelay)));
      html += row('Max Duration', fmtDuration(/** @type {string} */ (rs.maxDuration)));
    }
  }

  const cmd = /** @type {Record<string, unknown>|null} */ (data.command);
  if (cmd) {
    html += '<div class="detail-section">Command</div>';
    const cmdType = cmd.type === 'app' ? 'AppCommand' : cmd.type === 'webhook' ? 'Webhook' : String(cmd.type || '');
    html += row('Type', cmdType);
    html += row('Max Execution Time', fmtDuration(/** @type {string} */ (cmd.maxExecutionTime)));
    if (cmd.type === 'webhook') {
      html += row('URI', cmd.uri);
      html += row('Content-Type', cmd.contentType);
    }
    const payload = cmd.payload;
    if (payload != null) {
      html += '<div class="detail-section-sub">Payload</div>';
      html += `<div class="pre-wrap"><pre>${syntaxHighlight(expandJsonStrings(payload))}</pre><a class="pre-copy" onclick="copyPre(event)" title="Copy">&#10697;</a></div>`;
    }
  }

  return html;
};

window.openStepModal = async (wfKey, stepKey, stepName, createdAt) => {
  dom.modalTitle.textContent = stepName || 'Step Details';
  dom.modalBody.innerHTML = '<div class="modal-loading">Loading...</div>';
  dom.modal.classList.add('open');

  try {
    let url = `${engineUrl}/dashboard/step?wf=${encodeURIComponent(wfKey)}&step=${encodeURIComponent(stepKey)}`;
    if (createdAt) url += `&createdAt=${encodeURIComponent(createdAt)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Step not found (may have left inbox)');
    const data = await res.json();
    dom.modalBody.innerHTML = buildStepDetailHTML(data);
  } catch (err) {
    dom.modalBody.innerHTML = `<div class="modal-loading">${esc(/** @type {Error} */ (err).message)}</div>`;
  }
};

window.closeModal = () => dom.modal.classList.remove('open');

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.closeModal();
});

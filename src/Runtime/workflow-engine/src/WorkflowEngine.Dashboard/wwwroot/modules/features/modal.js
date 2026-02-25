/* Step detail modal — fetch, render, open/close */

import { dom, engineUrl } from '../core/state.js';
import { esc, escHtml, expandJsonStrings, syntaxHighlight, lineDiff, fmtTime, fmtDuration, fmtAgo } from '../core/helpers.js';

/**
 * Pretty-print a state value for display / diff.
 * @param {unknown} raw
 * @returns {string}
 */
const prettyState = (raw) => {
  if (raw == null) return '';
  const expanded = expandJsonStrings(raw);
  return typeof expanded === 'object' ? JSON.stringify(expanded, null, 2) : String(raw);
};

/**
 * Build a side-by-side diff HTML block.
 * @param {string} oldText
 * @param {string} newText
 * @returns {string}
 */
/** Syntax-highlight a single line of pretty-printed JSON (returns safe HTML). */
const highlightLine = (/** @type {string} */ line) => {
  const re = /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
  let result = '', last = 0, m;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) result += escHtml(line.slice(last, m.index));
    const tok = m[0];
    let cls = 'json-number';
    if (/^"/.test(tok)) {
      if (/:$/.test(tok)) { result += `<span class="json-key">${escHtml(tok.replace(/:$/, ''))}</span>:`; last = re.lastIndex; continue; }
      cls = 'json-string';
    } else if (/true|false/.test(tok)) { cls = 'json-bool'; }
    else if (/null/.test(tok)) { cls = 'json-null'; }
    result += `<span class="${cls}">${escHtml(tok)}</span>`;
    last = re.lastIndex;
  }
  if (last < line.length) result += escHtml(line.slice(last));
  return result;
};

const buildDiffHTML = (oldText, newText) => {
  const hunks = lineDiff(oldText, newText);

  /** @type {{ left: string, right: string, leftCls: string, rightCls: string }[]} */
  const rows = [];
  let i = 0;
  while (i < hunks.length) {
    const h = hunks[i];
    if (h.type === ' ') {
      rows.push({ left: h.line, right: h.line, leftCls: '', rightCls: '' });
      i++;
    } else if (h.type === '-') {
      const removes = [];
      while (i < hunks.length && hunks[i].type === '-') removes.push(hunks[i++].line);
      const adds = [];
      while (i < hunks.length && hunks[i].type === '+') adds.push(hunks[i++].line);
      const max = Math.max(removes.length, adds.length);
      for (let j = 0; j < max; j++) {
        rows.push({
          left: j < removes.length ? removes[j] : '',
          right: j < adds.length ? adds[j] : '',
          leftCls: j < removes.length ? 'diff-remove' : '',
          rightCls: j < adds.length ? 'diff-add' : '',
        });
      }
    } else {
      rows.push({ left: '', right: h.line, leftCls: '', rightCls: 'diff-add' });
      i++;
    }
  }

  let html = '<div class="diff-block">';
  html += '<div class="diff-header"><div class="diff-col-header">State In</div><div class="diff-col-header">State Out</div></div>';
  let lnL = 0, lnR = 0;
  for (const r of rows) {
    const numL = r.left !== '' || !r.rightCls ? ++lnL : '';
    const numR = r.right !== '' || !r.leftCls ? ++lnR : '';
    html += '<div class="diff-row">';
    html += `<span class="diff-ln">${numL}</span>`;
    html += `<pre class="diff-cell diff-cell-left ${r.leftCls}">${highlightLine(r.left)}</pre>`;
    html += `<span class="diff-gutter"></span>`;
    html += `<span class="diff-ln">${numR}</span>`;
    html += `<pre class="diff-cell diff-cell-right ${r.rightCls}">${highlightLine(r.right)}</pre>`;
    html += '</div>';
  }
  html += '</div>';
  return html;
};

/**
 * Build the State tab content.
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
const buildStateContent = (data) => {
  const stateIn = data.stateIn;
  const stateOut = data.stateOut;

  if (stateIn == null && stateOut == null) return '<div class="modal-loading">No state data available</div>';

  let html = '';
  const stateInPretty = prettyState(stateIn);
  const stateOutPretty = prettyState(stateOut);

  if (stateIn != null && stateOut != null) {
    const inHighlighted = syntaxHighlight(expandJsonStrings(stateIn));
    const outHighlighted = syntaxHighlight(expandJsonStrings(stateOut));

    html += `<div class="state-view active" data-view="diff">`;
    if (stateInPretty === stateOutPretty) {
      html += `<div class="diff-unchanged">No changes</div>`;
    } else {
      html += buildDiffHTML(stateInPretty, stateOutPretty);
    }
    html += `</div>`;
    html += `<div class="state-view" data-view="in"><div class="pre-wrap"><pre>${inHighlighted}</pre><button class="pre-copy" onclick="copyPre(event)" title="Copy">&#10697;</button></div></div>`;
    html += `<div class="state-view" data-view="out"><div class="pre-wrap"><pre>${outHighlighted}</pre><button class="pre-copy" onclick="copyPre(event)" title="Copy">&#10697;</button></div></div>`;
  } else if (stateIn != null) {
    html += `<div class="pre-wrap"><pre>${syntaxHighlight(expandJsonStrings(stateIn))}</pre><button class="pre-copy" onclick="copyPre(event)" title="Copy">&#10697;</button></div>`;
  } else {
    html += `<div class="pre-wrap"><pre>${syntaxHighlight(expandJsonStrings(stateOut))}</pre><button class="pre-copy" onclick="copyPre(event)" title="Copy">&#10697;</button></div>`;
  }

  return html;
};

/**
 * Build the Payload tab content.
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
const buildPayloadContent = (data) => {
  const cmd = /** @type {Record<string, unknown>|null} */ (data.command);
  const payload = cmd?.payload;
  if (payload == null) return '<div class="modal-loading">No payload</div>';
  return `<div class="pre-wrap"><pre>${syntaxHighlight(expandJsonStrings(payload))}</pre><button class="pre-copy" onclick="copyPre(event)" title="Copy">&#10697;</button></div>`;
};

/**
 * Build the Details tab content.
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
const buildDetailsContent = (data) => {
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
  }

  return html;
};

/**
 * Render tabs into the sticky tab bar and panels into the scrollable body.
 * @param {Record<string, unknown>} data
 */
/** Whether the current step has both stateIn and stateOut (for sub-tabs) */
let _hasStateDiff = false;

const renderStepDetail = (data) => {
  const cmd = /** @type {Record<string, unknown>|null} */ (data.command);
  const hasPayload = cmd?.payload != null;
  const hasState = data.stateIn != null || data.stateOut != null;
  _hasStateDiff = data.stateIn != null && data.stateOut != null;

  // Build sticky tab bar
  let tabs = '';
  tabs += `<button class="modal-tab active" onclick="switchModalTab(this,'details')">Details</button>`;
  if (hasState) tabs += `<button class="modal-tab" onclick="switchModalTab(this,'state')">State</button>`;
  if (hasPayload) tabs += `<button class="modal-tab" onclick="switchModalTab(this,'payload')">Payload</button>`;
  dom.modalTabs.innerHTML = tabs;
  dom.modalTabs.style.display = (hasPayload || hasState) ? 'flex' : 'none';

  // Build sticky state sub-tabs (Diff | State In | State Out)
  if (_hasStateDiff) {
    let subtabs = '';
    subtabs += `<button class="state-tab active" onclick="switchStateView(this,'diff')">Diff</button>`;
    subtabs += `<button class="state-tab" onclick="switchStateView(this,'in')">State In</button>`;
    subtabs += `<button class="state-tab" onclick="switchStateView(this,'out')">State Out</button>`;
    dom.modalSubtabs.innerHTML = subtabs;
  } else {
    dom.modalSubtabs.innerHTML = '';
  }
  dom.modalSubtabs.style.display = 'none'; // hidden until State tab is active

  // Build scrollable panels
  let body = '';
  body += `<div class="modal-tab-panel active" data-panel="details">${buildDetailsContent(data)}</div>`;
  if (hasState) body += `<div class="modal-tab-panel" data-panel="state">${buildStateContent(data)}</div>`;
  if (hasPayload) body += `<div class="modal-tab-panel" data-panel="payload">${buildPayloadContent(data)}</div>`;
  dom.modalBody.innerHTML = body;
};

/** Switch top-level modal tabs */
window.switchModalTab = (/** @type {HTMLElement} */ btn, /** @type {string} */ panel) => {
  for (const t of dom.modalTabs.querySelectorAll('.modal-tab')) t.classList.remove('active');
  btn.classList.add('active');
  for (const p of dom.modalBody.querySelectorAll('.modal-tab-panel')) {
    p.classList.toggle('active', p.getAttribute('data-panel') === panel);
  }
  // Show/hide state sub-tabs
  dom.modalSubtabs.style.display = (panel === 'state' && _hasStateDiff) ? 'flex' : 'none';
};

/** Switch state sub-tabs (diff / in / out) */
window.switchStateView = (/** @type {HTMLElement} */ btn, /** @type {string} */ view) => {
  for (const t of dom.modalSubtabs.querySelectorAll('.state-tab')) t.classList.remove('active');
  btn.classList.add('active');
  const statePanel = dom.modalBody.querySelector('[data-panel="state"]');
  if (!statePanel) return;
  for (const v of statePanel.querySelectorAll('.state-view')) {
    v.classList.toggle('active', v.getAttribute('data-view') === view);
  }
};

window.openStepModal = async (wfKey, stepKey, stepName, createdAt) => {
  dom.modalTitle.textContent = stepName || 'Step Details';
  dom.modalTabs.innerHTML = '';
  dom.modalTabs.style.display = 'none';
  dom.modalSubtabs.innerHTML = '';
  dom.modalSubtabs.style.display = 'none';
  dom.modalBody.innerHTML = '<div class="modal-loading">Loading...</div>';
  dom.modal.classList.add('open');

  try {
    let url = `${engineUrl}/dashboard/step?wf=${encodeURIComponent(wfKey)}&step=${encodeURIComponent(stepKey)}`;
    if (createdAt) url += `&createdAt=${encodeURIComponent(createdAt)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Step not found (may have left inbox)');
    const data = await res.json();
    // Enrich title for ExecuteServiceTask with the service task type
    if (stepName === 'ExecuteServiceTask' && data.command?.payload) {
      try {
        const p = typeof data.command.payload === 'string' ? JSON.parse(data.command.payload) : data.command.payload;
        if (p.serviceTaskType) dom.modalTitle.textContent = `${stepName}: ${p.serviceTaskType}`;
      } catch { /* ignore */ }
    }
    renderStepDetail(data);
  } catch (err) {
    dom.modalBody.innerHTML = `<div class="modal-loading">${esc(/** @type {Error} */ (err).message)}</div>`;
  }
};

window.closeModal = () => {
  dom.modal.classList.remove('open');
  dom.modalTabs.style.display = 'none';
  dom.modalSubtabs.style.display = 'none';
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.closeModal();
});

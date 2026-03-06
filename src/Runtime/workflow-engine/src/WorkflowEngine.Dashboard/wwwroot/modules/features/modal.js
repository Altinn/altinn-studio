/* Step detail modal — fetch, render, open/close, SSE-driven refresh */

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

  // Rich status row with backoff timer, processing elapsed, retry count, and action buttons
  let statusParts = `<span class="status-pill ${status}">${esc(status)}</span>`;
  if (data.backoffUntil && status === 'Requeued') {
    statusParts += ` <span class="step-backoff" data-backoff="${esc(/** @type {string} */ (data.backoffUntil))}"></span>`;
  } else if (status === 'Processing' && data.executionStartedAt) {
    statusParts += ` <span data-step-started="${esc(/** @type {string} */ (data.executionStartedAt))}"></span>`;
  }
  if (data.retryCount) statusParts += ` <span class="step-retry" style="margin-left:4px;margin-top:0">&#8635;${esc(String(data.retryCount))}</span>`;
  const showSkipBackoff = data.backoffUntil && status === 'Requeued' && (new Date(/** @type {string} */ (data.backoffUntil)) - Date.now()) > 5000;
  if (status === 'Failed') {
    statusParts += `<a class="step-retry-badge" style="margin-left:auto" onclick="retryWorkflow(event,'${esc(_openWfId)}')">&#8635; Retry</a>`;
  } else if (showSkipBackoff) {
    statusParts += `<a class="step-retry-badge" style="margin-left:auto" onclick="skipBackoff(event,'${esc(_openWfId)}','${esc(/** @type {string} */ (data.idempotencyKey))}')">&#9654; Retry now</a>`;
  }
  html += `<div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" style="display:flex;align-items:center;gap:6px">${statusParts}</span></div>`;
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

  const rs = /** @type {Record<string, unknown>|null} */ (data.retryStrategy);
  if (rs) {
    html += row('Backoff Type', rs.backoffType);
    html += row('Base Interval', fmtDuration(/** @type {string} */ (rs.baseInterval)));
    html += row('Max Retries', rs.maxRetries);
    html += row('Max Delay', fmtDuration(/** @type {string} */ (rs.maxDelay)));
    html += row('Max Duration', fmtDuration(/** @type {string} */ (rs.maxDuration)));
  }

  const cmd = /** @type {Record<string, unknown>|null} */ (data.command);
  if (cmd) {
    const cmdType = cmd.type === 'app' ? 'AppCommand' : cmd.type === 'webhook' ? 'Webhook' : String(cmd.type || '');
    html += row('Command Type', cmdType);
    html += row('Max Execution Time', fmtDuration(/** @type {string} */ (cmd.maxExecutionTime)));
    if (cmd.type === 'webhook') {
      html += row('URI', cmd.uri);
      html += row('Content-Type', cmd.contentType);
    }
  }

  // Error history section
  html += '<div class="detail-section" style="margin-top:24px"></div>';
  const errorHistory = /** @type {Array<{timestamp:string, message:string, httpStatusCode:number|null, wasRetryable:boolean}>|null} */ (data.errorHistory);
  if (errorHistory && errorHistory.length > 0) {
    html += `<div class="error-history${_errorExpanded ? ' expanded' : ''}">`;
    html += `<div class="error-history-header" onclick="toggleErrorHistory(this)">`;
    html += `<span class="error-history-chevron">&#9656;</span>`;
    html += `Error History (${errorHistory.length})`;
    html += `</div>`;
    html += `<div class="error-history-list">`;
    for (const entry of [...errorHistory].reverse()) {
      const retryable = entry.wasRetryable ? 'retryable' : 'non-retryable';
      const statusCode = entry.httpStatusCode ? ` HTTP ${entry.httpStatusCode}` : '';
      const ts = fmtTime(entry.timestamp);
      const ago = fmtAgo(entry.timestamp);
      html += `<div class="error-entry ${retryable}">`;
      html += `<div class="error-entry-meta">`;
      html += `<span class="error-entry-badge ${retryable}">${retryable}${statusCode}</span>`;
      if (ts) html += `<span class="error-entry-time"><span class="timestamp" data-iso="${esc(entry.timestamp)}">${esc(ts)}</span>`;
      if (ago) html += ` <span class="detail-ago">${esc(ago)}</span>`;
      if (ts) html += `</span>`;
      html += `</div>`;
      html += `<div class="error-entry-message">${esc(entry.message)}</div>`;
      html += `</div>`;
    }
    html += `</div></div>`;
  }
  if (data.idempotencyKey) {
    const lokiQuery = `{service_name="WorkflowEngine"} |= \`${data.idempotencyKey}\``;
    const panes = JSON.stringify({l:{datasource:"loki",queries:[{refId:"logs",expr:lokiQuery,datasource:{type:"loki",uid:"loki"}}],range:{from:"now-1h",to:"now"}}});
    const lokiUrl = 'http://localhost:7070/explore?schemaVersion=1&panes=' + encodeURIComponent(panes) + '&orgId=1';
    html += `<a class="modal-grafana-link" href="${lokiUrl}" target="_blank">View error logs in Grafana</a>`;
  }

  return html;
};

/**
 * Render tabs into the sticky tab bar and panels into the scrollable body.
 * @param {Record<string, unknown>} data
 */
/** Whether the current step has both stateIn and stateOut (for sub-tabs) */
let _hasStateDiff = false;

/** Currently open modal context (for SSE-driven refresh) */
let _openWfId = '';
let _openWfKey = '';
let _openStepKey = '';
let _openStepName = '';
let _refreshTimer = 0;
let _errorExpanded = true;

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

/** Toggle error history expand/collapse and persist state across re-renders */
window.toggleErrorHistory = (/** @type {HTMLElement} */ header) => {
  const container = header.parentElement;
  if (!container) return;
  container.classList.toggle('expanded');
  _errorExpanded = container.classList.contains('expanded');
};

/** Get the currently active tab name */
const activeTab = () =>
  dom.modalTabs.querySelector('.modal-tab.active')?.getAttribute('onclick')?.match(/'(\w+)'\)$/)?.[1] || 'details';

/** Get the currently active state sub-tab name */
const activeStateView = () =>
  dom.modalSubtabs.querySelector('.state-tab.active')?.getAttribute('onclick')?.match(/'(\w+)'\)$/)?.[1] || 'diff';

/** Fetch step data and render (or re-render) the modal */
const fetchAndRender = async (wfId, stepKey, stepName, initialTab) => {
  const url = `${engineUrl}/dashboard/step?wfId=${encodeURIComponent(wfId)}&step=${encodeURIComponent(stepKey)}`;

  try {
    const res = await fetch(url);
    if (_openWfId !== wfId || _openStepKey !== stepKey) return; // modal changed while fetching
    if (!res.ok) throw new Error('Step not found (may have left inbox)');
    const data = await res.json();
    if (_openWfId !== wfId || _openStepKey !== stepKey) return;

    // Enrich title for ExecuteServiceTask with the service task type
    if (stepName === 'ExecuteServiceTask' && data.command?.payload) {
      try {
        const p = typeof data.command.payload === 'string' ? JSON.parse(data.command.payload) : data.command.payload;
        if (p.serviceTaskType) dom.modalTitle.textContent = `${stepName}: ${p.serviceTaskType}`;
      } catch { /* ignore */ }
    }

    // Preserve active tabs across re-render
    const tab = initialTab || activeTab();
    const stateView = activeStateView();
    renderStepDetail(data);
    if (tab !== 'details') {
      const tabBtn = dom.modalTabs.querySelector(`.modal-tab[onclick*="'${tab}'"]`);
      if (tabBtn) tabBtn.click();
    }
    if (tab === 'state' && stateView !== 'diff') {
      const stateBtn = dom.modalSubtabs.querySelector(`.state-tab[onclick*="'${stateView}'"]`);
      if (stateBtn) stateBtn.click();
    }
  } catch (err) {
    if (_openWfId !== wfId || _openStepKey !== stepKey) return;
    dom.modalBody.innerHTML = `<div class="modal-loading">${esc(/** @type {Error} */ (err).message)}</div>`;
  }
};

window.openStepModal = async (wfId, stepKey, stepName, initialTab) => {
  _openWfId = wfId;
  _openWfKey = '';
  _openStepKey = stepKey;
  _openStepName = stepName || '';

  dom.modalTitle.textContent = stepName || 'Step Details';
  dom.modalTabs.innerHTML = '';
  dom.modalTabs.style.display = 'none';
  dom.modalSubtabs.innerHTML = '';
  dom.modalSubtabs.style.display = 'none';
  dom.modalBody.innerHTML = '<div class="modal-loading">Loading...</div>';
  dom.modal.classList.add('open');

  await fetchAndRender(wfId, stepKey, stepName, initialTab);
};

/** Called by live.js when a workflow fingerprint changes. Debounced refresh. */
export const notifyStepChanged = (/** @type {string} */ wfId) => {
  if (!_openWfId || wfId !== _openWfId) return;
  clearTimeout(_refreshTimer);
  _refreshTimer = window.setTimeout(
    () => fetchAndRender(_openWfId, _openStepKey, _openStepName),
    300
  );
};

window.closeModal = () => {
  _openWfId = '';
  _openWfKey = '';
  _openStepKey = '';
  clearTimeout(_refreshTimer);
  dom.modal.classList.remove('open');
  dom.modalTabs.style.display = 'none';
  dom.modalSubtabs.style.display = 'none';
};

/** Retry a failed workflow — called from card retry buttons */
window.retryWorkflow = async (e, workflowId) => {
  e.stopPropagation();
  const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const res = await fetch(`${engineUrl}/dashboard/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId }),
    });
    if (res.ok) {
      btn.textContent = 'Retried';
      btn.classList.add('retry-success');
    } else {
      const data = await res.json().catch(() => ({}));
      btn.textContent = 'Failed';
      btn.title = data.message || 'Retry failed';
      btn.classList.add('retry-failed');
      setTimeout(() => { btn.disabled = false; btn.innerHTML = '&#8635; Retry'; btn.classList.remove('retry-failed'); }, 3000);
    }
  } catch {
    btn.textContent = 'Error';
    btn.classList.add('retry-failed');
    setTimeout(() => { btn.disabled = false; btn.innerHTML = '&#8635; Retry'; btn.classList.remove('retry-failed'); }, 3000);
  }
};

/** Skip backoff timer for a step — called from pipeline skip buttons */
window.skipBackoff = async (e, workflowId, stepIdempotencyKey) => {
  e.stopPropagation();
  const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const res = await fetch(`${engineUrl}/dashboard/skip-backoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId, stepIdempotencyKey }),
    });
    if (res.ok) {
      btn.textContent = 'Skipped';
      btn.classList.add('skip-success');
    } else {
      btn.textContent = 'Failed';
      btn.classList.add('skip-failed');
      setTimeout(() => { btn.disabled = false; btn.textContent = 'skip'; btn.classList.remove('skip-failed'); }, 3000);
    }
  } catch {
    btn.textContent = 'Error';
    btn.classList.add('skip-failed');
    setTimeout(() => { btn.disabled = false; btn.textContent = 'skip'; btn.classList.remove('skip-failed'); }, 3000);
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.closeModal();
});

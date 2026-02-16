(() => {
  'use strict';

  /* ============================================================
   *  1. DOM REFERENCES
   * ============================================================ */

  const dom = {
    liveContainer:    document.getElementById('live-workflows'),
    liveCount:        document.getElementById('live-count'),
    liveEmpty:        document.getElementById('live-empty'),
    recentContainer:  document.getElementById('recent-workflows'),
    recentCount:      document.getElementById('recent-count'),
    recentSection:    document.getElementById('recent-section'),
    historyContainer: document.getElementById('history-workflows'),
    historyEmpty:     document.getElementById('history-empty'),
    connBadge:        document.getElementById('connection'),
    connText:         document.getElementById('connection-text'),
    modal:            document.getElementById('step-modal'),
    modalTitle:       document.getElementById('modal-title'),
    modalBody:        document.getElementById('modal-body'),
  };

  /* ============================================================
   *  2. STATE
   * ============================================================ */

  const state = {
    previousWorkflows:    {},   // keyed by idempotencyKey — last SSE snapshot
    workflowFingerprints: {},   // change-detection hash per workflow
    workflowTimers:       {},   // { startedAt, frozenAt? } per workflow
    recentlyFinished:     {},   // workflows that moved to the "Recent" section
    pendingRemoval:       {},   // workflows waiting for grace period before moving to recent
    historyLoaded:        false,
  };

  const MAX_RECENT = 5;
  const GRACE_MS   = 500;

  /* ============================================================
   *  3. SSE CONNECTION
   * ============================================================ */

  const connectSSE = () => {
    const es = new EventSource('/dashboard/stream');

    es.onopen = () => {
      dom.connBadge.className = 'connection connected';
      dom.connText.textContent = 'SSE Connected';
    };

    es.onmessage = (e) => {
      try { updateDashboard(JSON.parse(e.data)); }
      catch (err) { console.error('SSE parse error:', err); }
    };

    es.onerror = () => {
      dom.connBadge.className = 'connection disconnected';
      dom.connText.textContent = 'SSE Disconnected';
      es.close();
      setTimeout(connectSSE, 2000);
    };
  };

  /* ============================================================
   *  4. DASHBOARD UPDATE  (entry point for every SSE message)
   * ============================================================ */

  const updateDashboard = (data) => {
    updateStatusBadges(data.engineStatus);
    updateCapacity(data.capacity);
    updateLiveWorkflows(data.workflows);
    if (data.finished?.length > 0) {
      mergeFinished(data.finished);
    }
  };

  /* ============================================================
   *  5. HEADER — status badges
   * ============================================================ */

  const updateStatusBadges = (s) => {
    const rb = document.getElementById('badge-running');
    const rt = document.getElementById('badge-running-text');
    const hb = document.getElementById('badge-healthy');
    const ht = document.getElementById('badge-healthy-text');

    if (s.running) { rb.className = 'badge running'; rt.textContent = 'Running'; }
    else           { rb.className = 'badge stopped';  rt.textContent = 'Stopped'; }

    if (s.healthy) { hb.className = 'badge healthy';   ht.textContent = 'Healthy';   }
    else           { hb.className = 'badge unhealthy'; ht.textContent = 'Unhealthy'; }

    if (s.idle)     { rb.className = 'badge idle';     rt.textContent = 'Idle';     }
    if (s.disabled) { rb.className = 'badge disabled'; rt.textContent = 'Disabled'; }
    if (s.queueFull) {
      hb.className = 'badge queue-full';
      ht.textContent = 'Queue Full';
    }
  };

  /* ============================================================
   *  6. CAPACITY METERS
   * ============================================================ */

  const updateMeter = (id, slot) => {
    const fill = document.getElementById(`meter-${id}`);
    const val  = document.getElementById(`meter-${id}-val`);
    const pct  = slot.total > 0 ? (slot.used / slot.total) * 100 : 0;

    fill.style.width = `${Math.max(pct, 0.5)}%`;
    fill.className = `meter-fill ${pct < 50 ? 'low' : pct < 80 ? 'mid' : 'high'}`;
    val.textContent = `${slot.used.toLocaleString()} / ${slot.total.toLocaleString()}`;
  };

  const updateCapacity = (cap) => {
    updateMeter('inbox', cap.inbox);
    updateMeter('db',    cap.db);
    updateMeter('http',  cap.http);
  };

  /* ============================================================
   *  7. LIVE WORKFLOWS  (add / update / remove cards)
   * ============================================================ */

  const fingerprint = (wf) =>
    `${wf.status}|${wf.steps.map(s => `${s.status}:${s.retryCount}:${s.backoffUntil || ''}`).join(',')}`;

  const updateLiveWorkflows = (workflows) => {
    const currentKeys  = new Set(workflows.map(w => w.idempotencyKey));
    const previousKeys = new Set(Object.keys(state.previousWorkflows));

    // When a workflow disappears from SSE, start grace period before moving to recent
    for (const key of previousKeys) {
      if (!currentKeys.has(key) && !state.recentlyFinished[key] && !state.pendingRemoval[key]) {
        state.pendingRemoval[key] = state.previousWorkflows[key];
        setTimeout(() => moveToRecent(key), GRACE_MS);
      }
    }

    // If a pending-removal workflow reappears, cancel the move
    for (const key of currentKeys) {
      if (state.pendingRemoval[key]) delete state.pendingRemoval[key];
    }

    // Add or update active workflow cards
    for (const wf of workflows) {
      const elId = `wf-${cssId(wf.idempotencyKey)}`;
      let card = document.getElementById(elId);

      delete state.recentlyFinished[wf.idempotencyKey];

      const fp = fingerprint(wf);
      if (!card) {
        card = createWorkflowCard(wf, elId);
        dom.liveContainer.appendChild(card);
        state.workflowTimers[wf.idempotencyKey] = { startedAt: wf.executionStartedAt || wf.createdAt };
        state.workflowFingerprints[wf.idempotencyKey] = fp;
      } else if (state.workflowFingerprints[wf.idempotencyKey] !== fp) {
        card.innerHTML = buildCardHTML(wf);
        scrollPipelineToActive(card);
        state.workflowFingerprints[wf.idempotencyKey] = fp;
      }

      state.previousWorkflows[wf.idempotencyKey] = wf;
    }

    // Update counters
    const liveN   = workflows.length;
    const recentN = Object.keys(state.recentlyFinished).length;
    dom.liveCount.textContent      = liveN;
    dom.liveEmpty.style.display    = liveN === 0 && recentN === 0 ? 'block' : 'none';
    dom.recentCount.textContent    = recentN;
    dom.recentSection.style.display = recentN > 0 ? 'block' : 'none';
  };

  /* ============================================================
   *  8. RECENT WORKFLOWS  (grace period + move from live)
   * ============================================================ */

  const moveToRecent = (key) => {
    const lastWf = state.pendingRemoval[key];
    if (!lastWf) return;
    delete state.pendingRemoval[key];

    // Deep-clone and set final status
    const finishedWf = JSON.parse(JSON.stringify(lastWf));
    const anyFailed  = finishedWf.steps.some(s => s.status === 'Failed');
    const finalStatus = anyFailed ? 'Failed' : 'Completed';
    finishedWf.status = finalStatus;
    for (const s of finishedWf.steps) {
      if (s.status !== 'Failed' && s.status !== 'Canceled') s.status = finalStatus;
    }

    // Track in recentlyFinished and freeze the timer
    state.recentlyFinished[key] = { wf: finishedWf, removedAt: Date.now() };
    if (state.workflowTimers[key]) state.workflowTimers[key].frozenAt = Date.now();
    delete state.previousWorkflows[key];
    delete state.workflowFingerprints[key];

    // Remove the live card, create a recent card
    document.getElementById(`wf-${cssId(key)}`)?.remove();

    const recentCard = document.createElement('div');
    recentCard.className = 'workflow-card';
    recentCard.id = `wf-${cssId(key)}`;
    recentCard.style.animation = 'none';
    recentCard.innerHTML = buildCardHTML(finishedWf, true);
    dom.recentContainer.prepend(recentCard);

    evictOldRecent();

    const recentN = Object.keys(state.recentlyFinished).length;
    dom.recentCount.textContent = recentN;
    dom.recentSection.style.display = recentN > 0 ? 'block' : 'none';
    dom.liveCount.textContent = Object.keys(state.previousWorkflows).length;
  };

  const evictOldRecent = () => {
    const rfKeys = Object.keys(state.recentlyFinished).sort(
      (a, b) => state.recentlyFinished[b].removedAt - state.recentlyFinished[a].removedAt
    );
    while (rfKeys.length > MAX_RECENT) {
      const evictKey = rfKeys.pop();
      const el = document.getElementById(`wf-${cssId(evictKey)}`);
      if (el) {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 500);
      }
      delete state.recentlyFinished[evictKey];
      delete state.workflowTimers[evictKey];
      delete state.workflowFingerprints[evictKey];
    }
  };

  const mergeFinished = (finished) => {
    for (const fin of finished) {
      const target = state.pendingRemoval[fin.idempotencyKey];
      if (!target) continue;
      for (const fs of fin.steps) {
        const existing = target.steps.find(s => s.idempotencyKey === fs.idempotencyKey);
        if (existing && !existing.updatedAt && fs.updatedAt) {
          existing.updatedAt = fs.updatedAt;
        }
      }
    }
  };

  /* ============================================================
   *  9. CARD RENDERING  (shared by live, recent, and history)
   * ============================================================ */

  const createWorkflowCard = (wf, elId) => {
    const card = document.createElement('div');
    card.className = 'workflow-card';
    card.id = elId;
    card.innerHTML = buildCardHTML(wf);
    requestAnimationFrame(() => scrollPipelineToActive(card));
    return card;
  };

  const buildCardHTML = (wf, isStatic) => {
    const { instance: inst } = wf;
    const retries = wf.steps.reduce((sum, s) => sum + s.retryCount, 0);

    let html = `<div class="card-header">`;
    html += `<div><span class="instance-id">${esc(inst.org)}/${esc(inst.app)}/${inst.instanceOwnerPartyId}/</span>`;
    html += `<span class="instance-guid">${esc(inst.instanceGuid)}</span></div>`;
    html += `<div style="display:flex;align-items:center;gap:10px">`;
    html += `<span class="status-pill ${wf.status}"${isStatic ? ' style="animation:none"' : ''}>${wf.status}</span>`;
    if (!isStatic) {
      html += `<span class="elapsed" data-timer="${esc(wf.idempotencyKey)}">0.0s</span>`;
    }
    html += `</div></div>`;

    html += `<div class="card-meta">`;
    html += `<span class="wf-key">wf: ${esc(wf.operationId)}</span>`;
    if (retries > 0) html += `<span class="retry-badge">&#8635;${retries}</span>`;
    html += `</div>`;

    html += buildPipelineHTML(wf.idempotencyKey, wf.steps, isStatic);
    return html;
  };

  /* ============================================================
   *  10. PIPELINE RENDERING  (step circles + connectors)
   * ============================================================ */

  const buildPipelineHTML = (wfKey, steps, isStatic) => {
    if (!steps?.length) return '';

    let html = '<div class="pipeline">';
    steps.forEach((step, i) => {
      if (i > 0) html += buildConnectorHTML(steps[i - 1], step, isStatic);
      html += buildStepNodeHTML(wfKey, step, isStatic);
    });
    html += '</div>';
    return html;
  };

  const buildConnectorHTML = (prev, cur, isStatic) => {
    const prevDone      = prev.status === 'Completed';
    const curActive     = cur.status === 'Processing' || cur.status === 'Requeued';
    const isLeadingEdge = prevDone && curActive;

    const lineClass  = isStatic
      ? (prevDone ? 'active' : '')
      : (isLeadingEdge ? 'processing' : prevDone ? 'active' : '');
    const staticLine = isStatic || (prevDone && !isLeadingEdge);

    return `<div class="step-connector"><svg viewBox="0 0 56 6">`
      + `<line x1="0" y1="3" x2="56" y2="3" class="${lineClass}"`
      + (staticLine ? ' style="animation:none;stroke-dasharray:12,6.67"' : '')
      + `/></svg></div>`;
  };

  const stepIcon = (status) => {
    switch (status) {
      case 'Completed':  return '&#10003;';
      case 'Processing': return '&#9673;';
      case 'Failed':     return '&#10007;';
      case 'Requeued':   return '&#8635;';
      case 'Canceled':   return '&#8212;';
      default:           return '&#9675;';
    }
  };

  const buildStepTimingHTML = (step, isStatic) => {
    if (step.executionStartedAt && step.updatedAt && (step.status === 'Completed' || step.status === 'Failed')) {
      const dur = (new Date(step.updatedAt) - new Date(step.executionStartedAt)) / 1000;
      const label = dur < 1 ? `${(dur * 1000).toFixed(0)}ms` : `${dur.toFixed(1)}s`;
      return `<span class="step-timing">${label}</span>`;
    }
    if (step.status === 'Processing' && !isStatic) {
      return `<span class="step-timing">&hellip;</span>`;
    }
    return '';
  };

  const buildStepNodeHTML = (wfKey, step, isStatic) => {
    let html = `<div class="step-node">`;

    html += `<div class="step-circle ${step.status}"`
      + ` style="cursor:pointer${isStatic ? ';animation:none;box-shadow:none' : ''}"`
      + ` onclick="openStepModal('${esc(wfKey)}','${esc(step.idempotencyKey)}','${esc(step.commandDetail)}')">`
      + `${stepIcon(step.status)}</div>`;

    html += `<div class="step-label" title="${esc(step.commandDetail)}">${esc(step.commandDetail)}</div>`;

    html += `<div class="step-meta">`;
    html += `<span class="step-type ${esc(step.commandType)}">${esc(step.commandType)}</span>`;
    if (step.retryCount > 0) {
      html += `<div class="step-retry">&#8635;${step.retryCount}</div>`;
    }
    if (step.status === 'Requeued' && step.backoffUntil && !isStatic) {
      html += `<span class="step-backoff" data-backoff="${step.backoffUntil}"></span>`;
    }
    html += buildStepTimingHTML(step, isStatic);
    html += `</div></div>`;

    return html;
  };

  const scrollPipelineToActive = (card) => {
    const p = card.querySelector('.pipeline');
    if (!p) return;
    const active = p.querySelector('.step-circle.Processing') || p.querySelector('.step-circle.Requeued');
    if (active) {
      const node = active.closest('.step-node');
      if (node) {
        p.scrollLeft = Math.max(0, node.offsetLeft - p.offsetLeft - (p.clientWidth / 2) + (node.offsetWidth / 2));
        return;
      }
    }
    p.scrollLeft = p.scrollWidth;
  };

  /* ============================================================
   *  11. TIMERS  (workflow elapsed + step backoff countdowns)
   * ============================================================ */

  const formatElapsed = (seconds) => {
    if (seconds < 60)   return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const updateTimers = () => {
    const now = Date.now();

    for (const el of document.querySelectorAll('[data-timer]')) {
      const timer = state.workflowTimers[el.getAttribute('data-timer')];
      if (timer) {
        const end = timer.frozenAt || now;
        el.textContent = formatElapsed((end - new Date(timer.startedAt).getTime()) / 1000);
      }
    }

    for (const el of document.querySelectorAll('[data-backoff]')) {
      const remaining = (new Date(el.getAttribute('data-backoff')).getTime() - now) / 1000;
      el.textContent = remaining > 0 ? `retry ${remaining.toFixed(1)}s` : 'retrying...';
    }

    requestAnimationFrame(updateTimers);
  };

  /* ============================================================
   *  12. TABS
   * ============================================================ */

  window.switchTab = (tabName) => {
    for (const t of document.querySelectorAll('.tab')) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    }
    for (const p of document.querySelectorAll('.tab-panel')) {
      p.classList.toggle('active', p.id === `panel-${tabName}`);
    }
    if (tabName === 'history' && !state.historyLoaded) {
      state.historyLoaded = true;
      loadHistory();
    }
  };

  /* ============================================================
   *  13. HISTORY  (on-demand DB fetch)
   * ============================================================ */

  window.loadHistory = async () => {
    const filter = document.getElementById('history-filter').value;
    const btn    = document.getElementById('history-load');
    btn.disabled = true;
    btn.textContent = 'Loading...';

    try {
      const res = await fetch(`/dashboard/history?status=${filter}&limit=50`);
      const workflows = await res.json();

      dom.historyContainer.innerHTML = '';
      if (workflows.length === 0) {
        dom.historyEmpty.textContent = `No ${filter} workflows found`;
        dom.historyEmpty.style.display = 'block';
      } else {
        dom.historyEmpty.style.display = 'none';
        for (const wf of workflows) {
          const card = document.createElement('div');
          card.className = 'workflow-card';
          card.style.animation = 'none';
          card.innerHTML = buildCardHTML(wf, true);
          dom.historyContainer.appendChild(card);
        }
      }
    } catch (err) {
      dom.historyEmpty.textContent = `Error loading history: ${err.message}`;
      dom.historyEmpty.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Load';
    }
  };

  /* ============================================================
   *  14. STEP DETAIL MODAL
   * ============================================================ */

  window.openStepModal = async (wfKey, stepKey, stepName) => {
    dom.modalTitle.textContent = stepName || 'Step Details';
    dom.modalBody.innerHTML = '<div class="modal-loading">Loading...</div>';
    dom.modal.classList.add('open');

    try {
      const res = await fetch(`/dashboard/step?wf=${encodeURIComponent(wfKey)}&step=${encodeURIComponent(stepKey)}`);
      if (!res.ok) throw new Error('Step not found (may have left inbox)');
      const data = await res.json();
      dom.modalBody.innerHTML = `<pre>${syntaxHighlight(expandJsonStrings(data))}</pre>`;
    } catch (err) {
      dom.modalBody.innerHTML = `<div class="modal-loading">${esc(err.message)}</div>`;
    }
  };

  window.closeModal = () => dom.modal.classList.remove('open');

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* ============================================================
   *  15. JSON UTILITIES  (expand embedded JSON strings + syntax highlighting)
   * ============================================================ */

  const expandJsonStrings = (obj) => {
    if (typeof obj === 'string') {
      const t = obj.trim();
      if ((t[0] === '{' && t.at(-1) === '}') || (t[0] === '[' && t.at(-1) === ']')) {
        try { return expandJsonStrings(JSON.parse(t)); } catch { /* not valid JSON */ }
      }
      return obj;
    }
    if (Array.isArray(obj)) return obj.map(expandJsonStrings);
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, expandJsonStrings(v)])
      );
    }
    return obj;
  };

  const syntaxHighlight = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            return `<span class="json-key">${escHtml(match.replace(/:$/, ''))}</span>:`;
          }
          cls = 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-bool';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${escHtml(match)}</span>`;
      }
    );
  };

  /* ============================================================
   *  16. GENERIC HELPERS
   * ============================================================ */

  const cssId = (s) => s.replace(/[^a-zA-Z0-9-_]/g, '_');

  const esc = (s) => {
    if (!s) return '';
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  };

  const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ============================================================
   *  INIT
   * ============================================================ */

  connectSSE();
  requestAnimationFrame(updateTimers);

})();

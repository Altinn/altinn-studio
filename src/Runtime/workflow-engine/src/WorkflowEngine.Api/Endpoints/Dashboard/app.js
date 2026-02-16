(function(){
  'use strict';

  /* ============================================================
   *  1. DOM REFERENCES
   * ============================================================ */

  var dom = {
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

  var state = {
    previousWorkflows:    {},   // keyed by idempotencyKey — last SSE snapshot
    workflowFingerprints: {},   // change-detection hash per workflow
    workflowTimers:       {},   // { startedAt, frozenAt? } per workflow
    recentlyFinished:     {},   // workflows that moved to the "Recent" section
    pendingRemoval:       {},   // workflows waiting for grace period before moving to recent
    historyLoaded:        false,
  };

  var MAX_RECENT = 5;
  var GRACE_MS   = 500;

  /* ============================================================
   *  3. SSE CONNECTION
   * ============================================================ */

  function connectSSE() {
    var es = new EventSource('/dashboard/stream');

    es.onopen = function() {
      dom.connBadge.className = 'connection connected';
      dom.connText.textContent = 'SSE Connected';
    };

    es.onmessage = function(e) {
      try { updateDashboard(JSON.parse(e.data)); }
      catch (err) { console.error('SSE parse error:', err); }
    };

    es.onerror = function() {
      dom.connBadge.className = 'connection disconnected';
      dom.connText.textContent = 'SSE Disconnected';
      es.close();
      setTimeout(connectSSE, 2000);
    };
  }

  /* ============================================================
   *  4. DASHBOARD UPDATE  (entry point for every SSE message)
   * ============================================================ */

  function updateDashboard(data) {
    updateStatusBadges(data.engineStatus);
    updateCapacity(data.capacity);
    updateLiveWorkflows(data.workflows);
    if (data.finished && data.finished.length > 0) {
      mergeFinished(data.finished);
    }
  }

  /* ============================================================
   *  5. HEADER — status badges
   * ============================================================ */

  function updateStatusBadges(s) {
    var rb = document.getElementById('badge-running');
    var rt = document.getElementById('badge-running-text');
    var hb = document.getElementById('badge-healthy');
    var ht = document.getElementById('badge-healthy-text');

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
  }

  /* ============================================================
   *  6. CAPACITY METERS
   * ============================================================ */

  function updateCapacity(cap) {
    updateMeter('inbox', cap.inbox);
    updateMeter('db',    cap.db);
    updateMeter('http',  cap.http);
  }

  function updateMeter(id, slot) {
    var fill = document.getElementById('meter-' + id);
    var val  = document.getElementById('meter-' + id + '-val');
    var pct  = slot.total > 0 ? (slot.used / slot.total) * 100 : 0;

    fill.style.width = Math.max(pct, 0.5) + '%';
    fill.className = 'meter-fill ' + (pct < 50 ? 'low' : pct < 80 ? 'mid' : 'high');
    val.textContent = slot.used.toLocaleString() + ' / ' + slot.total.toLocaleString();
  }

  /* ============================================================
   *  7. LIVE WORKFLOWS  (add / update / remove cards)
   * ============================================================ */

  function updateLiveWorkflows(workflows) {
    var currentKeys  = new Set(workflows.map(function(w) { return w.idempotencyKey; }));
    var previousKeys = new Set(Object.keys(state.previousWorkflows));

    // When a workflow disappears from SSE, start grace period before moving to recent
    previousKeys.forEach(function(key) {
      if (!currentKeys.has(key) && !state.recentlyFinished[key] && !state.pendingRemoval[key]) {
        state.pendingRemoval[key] = state.previousWorkflows[key];
        setTimeout(function() { moveToRecent(key); }, GRACE_MS);
      }
    });

    // If a pending-removal workflow reappears, cancel the move
    currentKeys.forEach(function(key) {
      if (state.pendingRemoval[key]) delete state.pendingRemoval[key];
    });

    // Add or update active workflow cards
    workflows.forEach(function(wf) {
      var elId = 'wf-' + cssId(wf.idempotencyKey);
      var card = document.getElementById(elId);

      delete state.recentlyFinished[wf.idempotencyKey];

      var fp = fingerprint(wf);
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
    });

    // Update counters
    var liveN   = workflows.length;
    var recentN = Object.keys(state.recentlyFinished).length;
    dom.liveCount.textContent     = liveN;
    dom.liveEmpty.style.display   = liveN === 0 && recentN === 0 ? 'block' : 'none';
    dom.recentCount.textContent   = recentN;
    dom.recentSection.style.display = recentN > 0 ? 'block' : 'none';
  }

  function fingerprint(wf) {
    return wf.status + '|' + wf.steps.map(function(s) {
      return s.status + ':' + s.retryCount + ':' + (s.backoffUntil || '');
    }).join(',');
  }

  /* ============================================================
   *  8. RECENT WORKFLOWS  (grace period + move from live)
   * ============================================================ */

  function moveToRecent(key) {
    var lastWf = state.pendingRemoval[key];
    if (!lastWf) return;
    delete state.pendingRemoval[key];

    // Deep-clone and set final status
    var finishedWf = JSON.parse(JSON.stringify(lastWf));
    var anyFailed  = finishedWf.steps.some(function(s) { return s.status === 'Failed'; });
    var finalStatus = anyFailed ? 'Failed' : 'Completed';
    finishedWf.status = finalStatus;
    finishedWf.steps.forEach(function(s) {
      if (s.status !== 'Failed' && s.status !== 'Canceled') s.status = finalStatus;
    });

    // Track in recentlyFinished and freeze the timer
    state.recentlyFinished[key] = { wf: finishedWf, removedAt: Date.now() };
    if (state.workflowTimers[key]) state.workflowTimers[key].frozenAt = Date.now();
    delete state.previousWorkflows[key];
    delete state.workflowFingerprints[key];

    // Remove the live card, create a recent card
    var liveEl = document.getElementById('wf-' + cssId(key));
    if (liveEl) liveEl.remove();

    var recentCard = document.createElement('div');
    recentCard.className = 'workflow-card';
    recentCard.id = 'wf-' + cssId(key);
    recentCard.style.animation = 'none';
    recentCard.innerHTML = buildCardHTML(finishedWf, true);
    dom.recentContainer.prepend(recentCard);

    evictOldRecent();

    var recentN = Object.keys(state.recentlyFinished).length;
    dom.recentCount.textContent = recentN;
    dom.recentSection.style.display = recentN > 0 ? 'block' : 'none';
    dom.liveCount.textContent = Object.keys(state.previousWorkflows).length;
  }

  function evictOldRecent() {
    var rfKeys = Object.keys(state.recentlyFinished).sort(function(a, b) {
      return state.recentlyFinished[b].removedAt - state.recentlyFinished[a].removedAt;
    });
    while (rfKeys.length > MAX_RECENT) {
      var evictKey = rfKeys.pop();
      var el = document.getElementById('wf-' + cssId(evictKey));
      if (el) {
        el.classList.add('removing');
        setTimeout((function(e) { return function() { e.remove(); }; })(el), 500);
      }
      delete state.recentlyFinished[evictKey];
      delete state.workflowTimers[evictKey];
      delete state.workflowFingerprints[evictKey];
    }
  }

  function mergeFinished(finished) {
    finished.forEach(function(fin) {
      var target = state.pendingRemoval[fin.idempotencyKey];
      if (!target) return;
      fin.steps.forEach(function(fs) {
        var existing = target.steps.find(function(s) { return s.idempotencyKey === fs.idempotencyKey; });
        if (existing && !existing.updatedAt && fs.updatedAt) {
          existing.updatedAt = fs.updatedAt;
        }
      });
    });
  }

  /* ============================================================
   *  9. CARD RENDERING  (shared by live, recent, and history)
   * ============================================================ */

  function createWorkflowCard(wf, elId) {
    var card = document.createElement('div');
    card.className = 'workflow-card';
    card.id = elId;
    card.innerHTML = buildCardHTML(wf);
    requestAnimationFrame(function() { scrollPipelineToActive(card); });
    return card;
  }

  function buildCardHTML(wf, isStatic) {
    var inst    = wf.instance;
    var retries = wf.steps.reduce(function(sum, s) { return sum + s.retryCount; }, 0);

    var html = '<div class="card-header">';
    html += '<div><span class="instance-id">' + esc(inst.org) + '/' + esc(inst.app) + '/' + inst.instanceOwnerPartyId + '/</span>';
    html += '<span class="instance-guid">' + esc(inst.instanceGuid) + '</span></div>';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<span class="status-pill ' + wf.status + '"' + (isStatic ? ' style="animation:none"' : '') + '>' + wf.status + '</span>';
    if (!isStatic) {
      html += '<span class="elapsed" data-timer="' + esc(wf.idempotencyKey) + '">0.0s</span>';
    }
    html += '</div></div>';

    html += '<div class="card-meta">';
    html += '<span class="wf-key">wf: ' + esc(wf.operationId) + '</span>';
    if (retries > 0) html += '<span class="retry-badge">&#8635;' + retries + '</span>';
    html += '</div>';

    html += buildPipelineHTML(wf.idempotencyKey, wf.steps, isStatic);
    return html;
  }

  /* ============================================================
   *  10. PIPELINE RENDERING  (step circles + connectors)
   * ============================================================ */

  function buildPipelineHTML(wfKey, steps, isStatic) {
    if (!steps || steps.length === 0) return '';

    var html = '<div class="pipeline">';
    steps.forEach(function(step, i) {
      // Connector line between steps
      if (i > 0) {
        html += buildConnectorHTML(steps[i - 1], step, isStatic);
      }
      // Step node (circle + label + meta)
      html += buildStepNodeHTML(wfKey, step, isStatic);
    });
    html += '</div>';
    return html;
  }

  function buildConnectorHTML(prev, cur, isStatic) {
    var prevDone      = prev.status === 'Completed';
    var curActive     = cur.status === 'Processing' || cur.status === 'Requeued';
    var isLeadingEdge = prevDone && curActive;

    var lineClass  = isStatic
      ? (prevDone ? 'active' : '')
      : (isLeadingEdge ? 'processing' : prevDone ? 'active' : '');
    var staticLine = isStatic || (prevDone && !isLeadingEdge);

    return '<div class="step-connector"><svg viewBox="0 0 56 6">'
      + '<line x1="0" y1="3" x2="56" y2="3" class="' + lineClass + '"'
      + (staticLine ? ' style="animation:none;stroke-dasharray:12,6.67"' : '')
      + '/></svg></div>';
  }

  function buildStepNodeHTML(wfKey, step, isStatic) {
    var html = '<div class="step-node">';

    // Circle (clickable for detail modal)
    html += '<div class="step-circle ' + step.status + '"'
      + ' style="cursor:pointer' + (isStatic ? ';animation:none;box-shadow:none' : '') + '"'
      + ' onclick="openStepModal(\'' + esc(wfKey) + '\',\'' + esc(step.idempotencyKey) + '\',\'' + esc(step.commandDetail) + '\')">'
      + stepIcon(step.status) + '</div>';

    // Label (truncated to one line)
    html += '<div class="step-label" title="' + esc(step.commandDetail) + '">' + esc(step.commandDetail) + '</div>';

    // Meta: command type, retries, timing
    html += '<div class="step-meta">';
    html += '<span class="step-type ' + esc(step.commandType) + '">' + esc(step.commandType) + '</span>';
    if (step.retryCount > 0) {
      html += '<div class="step-retry">&#8635;' + step.retryCount + '</div>';
    }
    if (step.status === 'Requeued' && step.backoffUntil && !isStatic) {
      html += '<span class="step-backoff" data-backoff="' + step.backoffUntil + '"></span>';
    }
    html += buildStepTimingHTML(step, isStatic);
    html += '</div>';

    html += '</div>';
    return html;
  }

  function buildStepTimingHTML(step, isStatic) {
    // Real duration: only when both server timestamps exist
    if (step.executionStartedAt && step.updatedAt && (step.status === 'Completed' || step.status === 'Failed')) {
      var dur = (new Date(step.updatedAt).getTime() - new Date(step.executionStartedAt).getTime()) / 1000;
      var label = dur < 1 ? (dur * 1000).toFixed(0) + 'ms' : dur.toFixed(1) + 's';
      return '<span class="step-timing">' + label + '</span>';
    }
    // In-progress: show ellipsis (real timing not yet available)
    if (step.status === 'Processing' && !isStatic) {
      return '<span class="step-timing">&hellip;</span>';
    }
    return '';
  }

  function stepIcon(status) {
    switch (status) {
      case 'Completed':  return '&#10003;';
      case 'Processing': return '&#9673;';
      case 'Failed':     return '&#10007;';
      case 'Requeued':   return '&#8635;';
      case 'Canceled':   return '&#8212;';
      default:           return '&#9675;';
    }
  }

  function scrollPipelineToActive(card) {
    var p = card.querySelector('.pipeline');
    if (!p) return;
    var active = p.querySelector('.step-circle.Processing') || p.querySelector('.step-circle.Requeued');
    if (active) {
      var node = active.closest('.step-node');
      if (node) {
        p.scrollLeft = Math.max(0, node.offsetLeft - p.offsetLeft - (p.clientWidth / 2) + (node.offsetWidth / 2));
        return;
      }
    }
    p.scrollLeft = p.scrollWidth;
  }

  /* ============================================================
   *  11. TIMERS  (workflow elapsed + step backoff countdowns)
   * ============================================================ */

  function formatElapsed(seconds) {
    if (seconds < 60)   return seconds.toFixed(1) + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + Math.floor(seconds % 60) + 's';
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
  }

  function updateTimers() {
    var now = Date.now();

    // Workflow elapsed timers
    document.querySelectorAll('[data-timer]').forEach(function(el) {
      var timer = state.workflowTimers[el.getAttribute('data-timer')];
      if (timer) {
        var end = timer.frozenAt || now;
        el.textContent = formatElapsed((end - new Date(timer.startedAt).getTime()) / 1000);
      }
    });

    // Step backoff countdowns
    document.querySelectorAll('[data-backoff]').forEach(function(el) {
      var remaining = (new Date(el.getAttribute('data-backoff')).getTime() - now) / 1000;
      el.textContent = remaining > 0 ? 'retry ' + remaining.toFixed(1) + 's' : 'retrying...';
    });

    requestAnimationFrame(updateTimers);
  }

  /* ============================================================
   *  12. TABS
   * ============================================================ */

  window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(function(t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(function(p) {
      p.classList.toggle('active', p.id === 'panel-' + tabName);
    });
    if (tabName === 'history' && !state.historyLoaded) {
      state.historyLoaded = true;
      loadHistory();
    }
  };

  /* ============================================================
   *  13. HISTORY  (on-demand DB fetch)
   * ============================================================ */

  window.loadHistory = function() {
    var filter = document.getElementById('history-filter').value;
    var btn    = document.getElementById('history-load');
    btn.disabled = true;
    btn.textContent = 'Loading...';

    fetch('/dashboard/history?status=' + filter + '&limit=50')
      .then(function(r) { return r.json(); })
      .then(function(workflows) {
        dom.historyContainer.innerHTML = '';
        if (workflows.length === 0) {
          dom.historyEmpty.textContent = 'No ' + filter + ' workflows found';
          dom.historyEmpty.style.display = 'block';
        } else {
          dom.historyEmpty.style.display = 'none';
          workflows.forEach(function(wf) {
            var card = document.createElement('div');
            card.className = 'workflow-card';
            card.style.animation = 'none';
            card.innerHTML = buildCardHTML(wf, true);
            dom.historyContainer.appendChild(card);
          });
        }
      })
      .catch(function(err) {
        dom.historyEmpty.textContent = 'Error loading history: ' + err.message;
        dom.historyEmpty.style.display = 'block';
      })
      .finally(function() {
        btn.disabled = false;
        btn.textContent = 'Load';
      });
  };

  /* ============================================================
   *  14. STEP DETAIL MODAL
   * ============================================================ */

  window.openStepModal = function(wfKey, stepKey, stepName) {
    dom.modalTitle.textContent = stepName || 'Step Details';
    dom.modalBody.innerHTML = '<div class="modal-loading">Loading...</div>';
    dom.modal.classList.add('open');

    fetch('/dashboard/step?wf=' + encodeURIComponent(wfKey) + '&step=' + encodeURIComponent(stepKey))
      .then(function(r) {
        if (!r.ok) throw new Error('Step not found (may have left inbox)');
        return r.json();
      })
      .then(function(data) {
        dom.modalBody.innerHTML = '<pre>' + syntaxHighlight(expandJsonStrings(data)) + '</pre>';
      })
      .catch(function(err) {
        dom.modalBody.innerHTML = '<div class="modal-loading">' + esc(err.message) + '</div>';
      });
  };

  window.closeModal = function() { dom.modal.classList.remove('open'); };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  /* ============================================================
   *  15. JSON UTILITIES  (expand embedded JSON strings + syntax highlighting)
   * ============================================================ */

  function expandJsonStrings(obj) {
    if (typeof obj === 'string') {
      var t = obj.trim();
      if ((t[0] === '{' && t[t.length - 1] === '}') || (t[0] === '[' && t[t.length - 1] === ']')) {
        try { return expandJsonStrings(JSON.parse(t)); } catch (e) { /* not valid JSON */ }
      }
      return obj;
    }
    if (Array.isArray(obj)) return obj.map(expandJsonStrings);
    if (obj && typeof obj === 'object') {
      var result = {};
      for (var k in obj) {
        if (obj.hasOwnProperty(k)) result[k] = expandJsonStrings(obj[k]);
      }
      return result;
    }
    return obj;
  }

  function syntaxHighlight(obj) {
    var json = JSON.stringify(obj, null, 2);
    return json.replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function(match) {
        var cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            return '<span class="json-key">' + escHtml(match.replace(/:$/, '')) + '</span>:';
          }
          cls = 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-bool';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + escHtml(match) + '</span>';
      }
    );
  }

  /* ============================================================
   *  16. GENERIC HELPERS
   * ============================================================ */

  function cssId(s) { return s.replace(/[^a-zA-Z0-9-_]/g, '_'); }

  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ============================================================
   *  INIT
   * ============================================================ */

  connectSSE();
  requestAnimationFrame(updateTimers);

})();

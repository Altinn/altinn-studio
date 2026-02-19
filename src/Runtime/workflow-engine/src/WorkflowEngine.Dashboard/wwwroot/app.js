// @ts-check
(() => {
  'use strict';

  /* ============================================================
   *  0. TYPE DEFINITIONS  (JSDoc — checked by VS Code, no build step)
   * ============================================================ */

  /**
   * @typedef {'Enqueued' | 'Processing' | 'Completed' | 'Failed' | 'Requeued' | 'Canceled'} StepStatus
   * @typedef {'AppCommand' | 'Webhook' | 'Noop' | 'Throw' | 'Timeout' | 'Delegate'} CommandType
   */

  /**
   * @typedef {{
   *   idempotencyKey: string,
   *   operationId:    string,
   *   commandType:    CommandType,
   *   commandDetail:  string,
   *   commandPayload: string | null,
   *   status:         StepStatus,
   *   processingOrder: number,
   *   retryCount:     number,
   *   backoffUntil:   string | null,
   *   createdAt:      string,
   *   executionStartedAt: string | null,
   *   updatedAt:      string | null,
   * }} Step
   */

  /**
   * @typedef {{
   *   org: string,
   *   app: string,
   *   instanceOwnerPartyId: number,
   *   instanceGuid: string,
   * }} InstanceInfo
   */

  /**
   * @typedef {{
   *   idempotencyKey: string,
   *   operationId:    string,
   *   status:         string,
   *   traceId:        string | null,
   *   instance:       InstanceInfo,
   *   createdAt:      string,
   *   updatedAt:      string | null,
   *   executionStartedAt: string | null,
   *   removedAt:      string | null,
   *   startAt:        string | null,
   *   steps:          Step[],
   * }} Workflow
   */

  /**
   * @typedef {{ used: number, available: number, total: number }} SlotStatus
   *
   * @typedef {{
   *   running:   boolean,
   *   healthy:   boolean,
   *   idle:      boolean,
   *   disabled:  boolean,
   *   queueFull: boolean,
   * }} EngineStatus
   *
   * @typedef {{
   *   timestamp:    string,
   *   engineStatus: EngineStatus,
   *   capacity:       { inbox: SlotStatus, db: SlotStatus, http: SlotStatus },
   *   scheduledCount: number,
   *   workflows:      Workflow[],
   * }} DashboardPayload
   */

  /**
   * @typedef {{ startedAt: string, frozenAt?: number }} WorkflowTimer
   *
   * @typedef {{
   *   previousWorkflows:    Record<string, Workflow>,
   *   workflowFingerprints: Record<string, string>,
   *   workflowTimers:       Record<string, WorkflowTimer>,
   *   lastRecentKeys:       string,
   *   queryLoaded:        boolean,
   *   liveFilter:           string,
   *   querySearch:          string,
   *   sectionStatus:        Record<string, string>,
   *   orgFilter:            Set<string>,
   *   appFilter:            Set<string>,
   *   partyFilter:          Set<string>,
   *   guidFilter:           Set<string>,
   * }} DashboardState
   */

  /* ============================================================
   *  1. DOM REFERENCES
   * ============================================================ */

  const dom = {
    liveContainer:    /** @type {HTMLElement} */ (document.getElementById('live-workflows')),
    liveEmpty:        /** @type {HTMLElement} */ (document.getElementById('live-empty')),
    recentContainer:  /** @type {HTMLElement} */ (document.getElementById('recent-workflows')),
    recentEmpty:      /** @type {HTMLElement} */ (document.getElementById('recent-empty')),
    recentSection:    /** @type {HTMLElement} */ (document.getElementById('recent-section')),
    queryContainer: /** @type {HTMLElement} */ (document.getElementById('query-workflows')),
    queryEmpty:     /** @type {HTMLElement} */ (document.getElementById('query-empty')),
    liveFilterInput:  /** @type {HTMLInputElement} */ (document.getElementById('live-filter-input')),
    liveFilterClear:  /** @type {HTMLElement} */ (document.getElementById('live-filter-clear')),
    querySearchInput: /** @type {HTMLInputElement} */ (document.getElementById('query-search-input')),
    orgDropdown:      /** @type {HTMLElement} */ (document.getElementById('org-dropdown')),
    appDropdown:      /** @type {HTMLElement} */ (document.getElementById('app-dropdown')),
    orgList:          /** @type {HTMLElement} */ (document.getElementById('org-list')),
    appList:          /** @type {HTMLElement} */ (document.getElementById('app-list')),
    orgSelected:      /** @type {HTMLElement} */ (document.getElementById('org-selected')),
    appSelected:      /** @type {HTMLElement} */ (document.getElementById('app-selected')),
    partyChips:       /** @type {HTMLElement} */ (document.getElementById('party-chips')),
    guidChips:        /** @type {HTMLElement} */ (document.getElementById('guid-chips')),
    scheduledSection: /** @type {HTMLElement} */ (document.getElementById('scheduled-section')),
    scheduledContainer: /** @type {HTMLElement} */ (document.getElementById('scheduled-workflows')),
    sseDot:           /** @type {HTMLElement} */ (document.getElementById('sse-dot')),
    engineIcon:       /** @type {HTMLElement} */ (document.getElementById('engine-icon')),
    engineStatusLabel:/** @type {HTMLElement} */ (document.getElementById('engine-status-label')),
    modal:            /** @type {HTMLElement} */ (document.getElementById('step-modal')),
    modalTitle:       /** @type {HTMLElement} */ (document.getElementById('modal-title')),
    modalBody:        /** @type {HTMLElement} */ (document.getElementById('modal-body')),
    themeToggle:      /** @type {HTMLElement} */ (document.getElementById('theme-toggle')),
    themeIcon:        /** @type {HTMLElement} */ (document.getElementById('theme-icon')),
    themeLabel:       /** @type {HTMLElement} */ (document.getElementById('theme-label')),
  };

  /* ============================================================
   *  2. STATE
   * ============================================================ */

  /** Engine API base URL (resolved from /api/config) */
  let engineUrl = '';

  /** @type {DashboardState} */
  const state = {
    previousWorkflows:    {},
    workflowFingerprints: {},
    workflowTimers:       {},
    lastRecentKeys:       '',
    queryLoaded:        false,
    liveFilter:           '',
    querySearch:          '',
    sectionStatus:        { scheduled: '', live: '', recent: '', query: '' },
    orgFilter:            new Set(),
    appFilter:            new Set(),
    partyFilter:          new Set(),
    guidFilter:           new Set(),
    /** @type {Map<string, Set<string>>} org → set of apps */
    orgsAndApps: new Map(),
    orgsAndAppsLoaded: false,
    compactSections: {
      scheduled: localStorage.getItem('compact:scheduled') === '1',
      inbox:     localStorage.getItem('compact:inbox') === '1',
      recent:    localStorage.getItem('compact:recent') === '1',
      query:     localStorage.getItem('compact:query') !== '0',
    },
    /** @type {Workflow[]} */ recentWorkflows: [],
    /** @type {Set<string>} */ pendingExpand: new Set(),
  };

  /** @type {Record<string, Workflow>} */
  const workflowData = {};

  /* ── BPMN transition parsing & step phase mapping ────────── */

  /** Parse BPMN transition from a "next" workflow's idempotencyKey.
   *  @param {Workflow} wf
   *  @returns {{ from: string, to: string } | null} */
  const parseTransition = (wf) => {
    if (wf.operationId !== 'next') return null;
    const m = wf.idempotencyKey.match(/\/next\/from-(.*?)-to-(.+)$/);
    return m ? { from: m[1], to: m[2] } : null;
  };

  const TASK_END_COMMANDS = new Set([
    'ProcessTaskEnd','CommonTaskFinalization','EndTaskLegacyHook',
    'OnTaskEndingHook','LockTaskData',
    'ProcessTaskAbandon','OnTaskAbandonHook','AbandonTaskLegacyHook',
  ]);
  const TASK_START_COMMANDS = new Set([
    'UnlockTaskData','ProcessTaskStart','OnTaskStartingHook',
    'CommonTaskInitialization',
  ]);
  const COMMIT_COMMANDS = new Set([
    'UpdateProcessState',
  ]);
  const POST_COMMIT_COMMANDS = new Set([
    'MovedToAltinnEvent','ExecuteServiceTask','InstanceCreatedAltinnEvent',
    'OnProcessEndingHook','ProcessEndLegacyHook','CompletedAltinnEvent',
  ]);

  /** @param {string} commandDetail @returns {'end'|'start'|'process'|'post'|null} */
  const stepPhase = (commandDetail) => {
    if (TASK_END_COMMANDS.has(commandDetail)) return 'end';
    if (TASK_START_COMMANDS.has(commandDetail)) return 'start';
    if (COMMIT_COMMANDS.has(commandDetail)) return 'commit';
    if (POST_COMMIT_COMMANDS.has(commandDetail)) return 'post';
    return null;
  };

  /** Extra sub-label for a step (e.g. service task type). Returns null if none. */
  const stepSubLabel = (step) => {
    if (step.commandDetail === 'ExecuteServiceTask' && step.commandPayload) {
      try {
        const p = JSON.parse(step.commandPayload);
        if (p.serviceTaskType) return p.serviceTaskType;
      } catch { /* ignore */ }
    }
    return null;
  };

  /* ============================================================
   *  3. SSE CONNECTION
   * ============================================================ */

  /**
   * @param {string} url
   * @param {(data: unknown) => void} onMessage
   * @param {{ showStatus?: boolean }} [opts]
   */
  /**
   * Register an org+app pair in the orgsAndApps map.
   * @param {string} org @param {string} app
   * @returns {boolean} true if something new was added
   */
  const addOrgAndApp = (org, app) => {
    const o = org.toLowerCase();
    const a = app.toLowerCase();
    let changed = false;
    if (!state.orgsAndApps.has(o)) { state.orgsAndApps.set(o, new Set()); changed = true; }
    const apps = /** @type {Set<string>} */ (state.orgsAndApps.get(o));
    if (!apps.has(a)) { apps.add(a); changed = true; }
    return changed;
  };

  /** Get the set of apps available for the currently selected org(s). */
  const getAppsForSelectedOrgs = () => {
    const result = new Set();
    if (state.orgFilter.size === 0) return result;
    const orgs = state.orgFilter;
    for (const o of orgs) {
      const apps = state.orgsAndApps.get(o);
      if (apps) for (const a of apps) result.add(a);
    }
    return result;
  };

  /** Rebuild both dropdowns and auto-select when there's only one choice. */
  const refreshOrgAppDropdowns = () => {
    // Org dropdown — all known orgs
    const allOrgs = new Set(state.orgsAndApps.keys());
    rebuildDropdown(dom.orgList, allOrgs, state.orgFilter);
    updateDropdownToggle('org');

    // Auto-select sole org
    if (allOrgs.size === 1 && state.orgFilter.size === 0) {
      const sole = [...allOrgs][0];
      state.orgFilter.add(sole);
      rebuildDropdown(dom.orgList, allOrgs, state.orgFilter);
      updateDropdownToggle('org');
    }

    // App dropdown — only apps for selected org(s)
    refreshAppDropdown();
  };

  /** Rebuild the app dropdown based on current org selection. */
  const refreshAppDropdown = () => {
    const availableApps = getAppsForSelectedOrgs();

    // Prune app selections that are no longer valid (only after orgs+apps have loaded)
    if (state.orgsAndAppsLoaded) {
      for (const a of [...state.appFilter]) {
        if (!availableApps.has(a)) state.appFilter.delete(a);
      }
    }

    rebuildDropdown(dom.appList, availableApps, state.appFilter);
    updateDropdownToggle('app');

    // Disable app dropdown when no org is selected
    const noOrg = state.orgFilter.size === 0;
    dom.appDropdown.classList.toggle('disabled', noOrg);

    // Auto-select all apps when 10 or fewer
    if (availableApps.size > 0 && availableApps.size <= 10 && state.appFilter.size === 0) {
      for (const a of availableApps) state.appFilter.add(a);
      rebuildDropdown(dom.appList, availableApps, state.appFilter);
      updateDropdownToggle('app');
      syncUrl();
    }
  };

  /** Fetch distinct org+app pairs from the DB to populate dropdowns. */
  const fetchOrgsAndApps = () => {
    fetch(`${engineUrl}/dashboard/orgs-and-apps`).then(r => r.json()).then(/** @param {{ org: string, app: string }[]} pairs */ pairs => {
      for (const p of pairs) {
        if (p.org && p.app) addOrgAndApp(p.org, p.app);
      }
      state.orgsAndAppsLoaded = true;
      refreshOrgAppDropdowns();
      applyFilter();
      syncUrl();
      if (state.queryLoaded) loadQuery();
    }).catch(() => {});
  };

  let disconnectTimer = 0;

  const connectSSE = (url, onMessage, opts) => {
    const es = new EventSource(url);
    const showStatus = opts?.showStatus ?? false;

    if (showStatus) {
      es.onopen = () => {
        clearTimeout(disconnectTimer);
        dom.sseDot.className = 'sse-dot connected';
        dom.engineStatusLabel.className = 'engine-status-label';
        fetchOrgsAndApps();
      };
    }

    es.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); }
      catch (err) { console.error('SSE parse error:', err); }
    };

    es.onerror = () => {
      if (showStatus) {
        dom.sseDot.className = 'sse-dot disconnected';
        dom.engineIcon.setAttribute('class', 'engine-icon stopped');
        dom.engineIcon.setAttribute('title', 'Disconnected');
        clearTimeout(disconnectTimer);
        disconnectTimer = setTimeout(() => {
          dom.engineStatusLabel.className = 'engine-status-label visible';
        }, 1000);
      }
      es.close();
      setTimeout(() => connectSSE(url, onMessage, opts), 2000);
    };
  };

  /* ============================================================
   *  4. DASHBOARD UPDATE  (entry point for every SSE message)
   * ============================================================ */

  /** @param {DashboardPayload} data */
  const updateDashboard = (data) => {
    updateStatusBadges(data.engineStatus);
    updateCapacity(data.capacity);
    updateScheduledBadge(data.scheduledCount);
    updateLiveWorkflows(data.workflows);
  };

  /* ============================================================
   *  5. HEADER — status badges
   * ============================================================ */

  /** @param {EngineStatus} s */
  const updateStatusBadges = (s) => {
    let cls = 'stopped';
    let label = 'Stopped';

    if (s.running) {
      cls = 'running'; label = 'Running';
      if (s.idle)      { cls = 'idle';       label = 'Idle';       }
      if (s.queueFull) { cls = 'queue-full'; label = 'Queue Full'; }
      if (!s.healthy)  { cls = 'unhealthy';  label = 'Unhealthy';  }
    }
    if (s.disabled) { cls = 'disabled'; label = 'Disabled'; }

    dom.engineIcon.setAttribute('class', `engine-icon ${cls}`);
    dom.engineIcon.setAttribute('title', label);
    dom.engineStatusLabel.className = 'engine-status-label';
  };

  /* ============================================================
   *  6. CAPACITY METERS
   * ============================================================ */

  /**
   * @param {string} id
   * @param {SlotStatus} slot
   */
  const updateMeter = (id, slot) => {
    const fill = /** @type {HTMLElement} */ (document.getElementById(`meter-${id}`));
    const val  = /** @type {HTMLElement} */ (document.getElementById(`meter-${id}-val`));
    const pct  = slot.total > 0 ? (slot.used / slot.total) * 100 : 0;

    fill.style.width = `${Math.max(pct, 0.5)}%`;
    fill.className = `meter-fill ${pct < 50 ? 'low' : pct < 80 ? 'mid' : 'high'}`;
    val.textContent = `${slot.used.toLocaleString()} / ${slot.total.toLocaleString()}`;
  };

  /** @param {{ inbox: SlotStatus, db: SlotStatus, http: SlotStatus }} cap */
  const updateCapacity = (cap) => {
    updateMeter('inbox', cap.inbox);
    updateMeter('db',    cap.db);
    updateMeter('http',  cap.http);
  };

  /* ============================================================
   *  7. SCHEDULED WORKFLOWS  (count badge + on-demand detail)
   * ============================================================ */

  let lastScheduledCount = -1;

  /** @param {number} count */
  const updateScheduledBadge = (count) => {
    if (count !== lastScheduledCount) {
      lastScheduledCount = count;
      loadScheduled();
    }
  };

  const loadScheduled = async () => {
    if (dom.scheduledSection.classList.contains('collapsed')) return;

    try {
      const res = await fetch(`${engineUrl}/dashboard/scheduled`);
      /** @type {Workflow[]} */
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
      applyFilter();
    } catch { /* non-critical */ }
  };

  /** @param {string} sectionId */
  window.toggleSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.classList.toggle('collapsed');
    const collapsed = section.classList.contains('collapsed');
    try { localStorage.setItem(`section:${sectionId}`, collapsed ? '1' : '0'); } catch { /* ignore */ }
    syncUrl();
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
   * @param {Workflow} wf
   * @returns {string}
   */
  const buildScheduledCardHTML = (wf) => {
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

  /* ============================================================
   *  8. LIVE WORKFLOWS  (add / update / remove cards)
   * ============================================================ */

  /** @param {Workflow} wf */
  const fingerprint = (wf) =>
    `${wf.status}|${wf.steps.map(s => `${s.status}:${s.retryCount}:${s.backoffUntil || ''}`).join(',')}`;

  /** @param {Workflow[]} workflows */
  const updateLiveWorkflows = (workflows) => {
    const currentKeys = new Set(workflows.map(w => w.idempotencyKey));

    // Animate out cards for workflows no longer in inbox
    for (const key of Object.keys(state.previousWorkflows)) {
      if (!currentKeys.has(key)) {
        const card = document.getElementById(`wf-${cssId(key)}`);
        if (card && !card.dataset.exiting) {
          const visible = card.offsetParent !== null;
          if (visible) {
            const failed = state.previousWorkflows[key]?.status === 'Failed';
            if (failed) card.classList.add('exit-fail');
            card.dataset.exiting = '1';
            card.style.animation = 'complete-exit 0.5s ease forwards';
            card.style.pointerEvents = 'none';
            card.addEventListener('animationend', () => {
              card.remove();
              if (!dom.liveContainer.querySelector('.workflow-card')) {
                dom.liveEmpty.style.display = 'block';
              }
            }, { once: true });
          } else {
            card.remove();
          }
        }
        delete state.previousWorkflows[key];
        delete state.workflowFingerprints[key];
        delete state.workflowTimers[key];
      }
    }

    // Add or update active workflow cards
    for (const wf of workflows) {
      const elId = `wf-${cssId(wf.idempotencyKey)}`;
      let card = document.getElementById(elId);

      const fp = fingerprint(wf);
      if (!card) {
        card = createWorkflowCard(wf, elId);
        dom.liveContainer.appendChild(card);
        state.workflowTimers[wf.idempotencyKey] = { startedAt: wf.executionStartedAt || wf.createdAt };
        state.workflowFingerprints[wf.idempotencyKey] = fp;
      } else if (state.workflowFingerprints[wf.idempotencyKey] !== fp) {
        const isCompact = card.classList.contains('compact');
        card.innerHTML = isCompact ? buildCompactCardHTML(wf) : buildCardHTML(wf);
        setCardFilterData(card, wf);
        if (!isCompact) scrollPipelineToActive(card);
        state.workflowFingerprints[wf.idempotencyKey] = fp;
      }

      state.previousWorkflows[wf.idempotencyKey] = wf;
    }

    // Only show empty state immediately if no cards exist (including exiting ones)
    const hasCards = dom.liveContainer.querySelector('.workflow-card') !== null;
    const isEmpty = workflows.length === 0 && !hasCards;
    dom.liveEmpty.style.display = isEmpty ? 'block' : 'none';
    mergeDiscoveredOrgsAndApps();
    applyFilter();
  };

  /* ============================================================
   *  9. RECENT WORKFLOWS  (rendered from backend cache)
   * ============================================================ */

  /** @param {Workflow[]} recent */
  const updateRecentWorkflows = (recent) => {
    const list = recent ?? [];
    state.recentWorkflows = list;
    const recentN = list.length;

    dom.recentEmpty.style.display = recentN === 0 ? 'block' : 'none';

    // Only update if the set of keys changed
    const newKeys = list.map(r => r.idempotencyKey).join(',');
    if (newKeys === state.lastRecentKeys) return;

    const isFirstLoad = state.lastRecentKeys === '';
    const previousKeys = new Set(state.lastRecentKeys.split(',').filter(Boolean));
    state.lastRecentKeys = newKeys;

    // Remove cards no longer in the list
    for (const key of previousKeys) {
      if (!list.some(w => w.idempotencyKey === key)) {
        document.getElementById(`wf-recent-${cssId(key)}`)?.remove();
      }
    }

    // Add new cards, skip existing ones
    for (let i = 0; i < list.length; i++) {
      const wf = list[i];
      const elId = `wf-recent-${cssId(wf.idempotencyKey)}`;
      const existing = document.getElementById(elId);

      if (existing) {
        // Ensure correct order
        if (existing !== dom.recentContainer.children[i]) {
          dom.recentContainer.insertBefore(existing, dom.recentContainer.children[i] ?? null);
        }
        continue;
      }

      const card = document.createElement('div');
      const forceExpand = state.pendingExpand.delete(wf.idempotencyKey);
      const compact = state.compactSections.recent && !forceExpand;
      card.className = `workflow-card${compact ? ' compact' : ''}`;
      card.id = elId;
      if (!isFirstLoad) {
        const glowName = wf.status === 'Failed' ? 'recent-glow-fail' : 'recent-glow';
        card.style.animation = compact
          ? `${glowName} 0.6s ease forwards`
          : `recent-enter 0.3s ease both, ${glowName} 0.6s ease forwards`;
        card.addEventListener('animationend', () => { card.style.animation = 'none'; }, { once: true });
      }
      card.innerHTML = compact ? buildCompactCardHTML(wf, true) : buildCardHTML(wf, true);
      setCardFilterData(card, wf);
      dom.recentContainer.insertBefore(card, dom.recentContainer.children[i] ?? null);
    }
    mergeDiscoveredOrgsAndApps();
    applyFilter();
  };

  /* ============================================================
   *  10. CARD RENDERING  (shared by live, recent, and query)
   * ============================================================ */

  /**
   * @param {Workflow} wf
   * @param {string} elId
   * @returns {HTMLDivElement}
   */
  const createWorkflowCard = (wf, elId) => {
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

  /** @param {string} guid */
  const copyIconHTML = (guid) =>
    `<a class="open-btn" onclick="copyGuid(event,'${esc(guid)}')" title="Copy instance GUID">&#10697;</a>`;
  /** @param {InstanceInfo} inst */
  const openIconHTML = (inst) => {
    const url = `http://local.altinn.cloud/${esc(inst.org)}/${esc(inst.app)}/#/instance/${inst.instanceOwnerPartyId}/${esc(inst.instanceGuid)}`;
    return `<a class="open-btn" href="${url}" target="_blank" onclick="event.stopPropagation()" title="Open instance">&#8599;</a>`;
  };

  /** @param {string} traceId @param {string} [title] @param {string} [extraClass] @returns {string} */
  const traceLink = (traceId, title, extraClass) => {
    const panes = JSON.stringify({t:{datasource:"tempo",queries:[{refId:"traceId",queryType:"traceql",query:traceId,datasource:{type:"tempo",uid:"tempo"},limit:20,tableType:"traces"}],range:{from:"now-1h",to:"now"}}});
    const url = 'http://localhost:7070/explore?schemaVersion=1&panes=' + encodeURIComponent(panes) + '&orgId=1';
    return `<a class="open-btn grafana-btn${extraClass ? ' ' + extraClass : ''}" href="${url}" target="_blank" onclick="event.stopPropagation()" title="${title || 'View trace in Grafana'}"><svg viewBox="0 0 351 365" fill="currentColor"><path d="M342,161.2c-.6-6.1-1.6-13.1-3.6-20.9-2-7.7-5-16.2-9.4-25-4.4-8.8-10.1-17.9-17.5-26.8-2.9-3.5-6.1-6.9-9.5-10.2 5.1-20.3-6.2-37.9-6.2-37.9-19.5-1.2-31.9 6.1-36.5 9.4-.8-.3-1.5-.7-2.3-1-3.3-1.3-6.7-2.6-10.3-3.7-3.5-1.1-7.1-2.1-10.8-3-3.7-.9-7.4-1.6-11.2-2.2-.7-.1-1.3-.2-2-.3-8.5-27.2-32.9-38.6-32.9-38.6-27.3 17.3-32.4 41.5-32.4 41.5s-.1.5-.3 1.4c-1.5.4-3 .9-4.5 1.3-2.1.6-4.2 1.4-6.2 2.2-2.1.8-4.1 1.6-6.2 2.5-4.1 1.8-8.2 3.8-12.2 6-3.9 2.2-7.7 4.6-11.4 7.1-.5-.2-1-.4-1-.4-37.8-14.4-71.3 2.9-71.3 2.9-3.1 40.2 15.1 65.5 18.7 70.1-.9 2.5-1.7 5-2.5 7.5-2.8 9.1-4.9 18.4-6.2 28.1-.2 1.4-.4 2.8-.5 4.2C18.8 192.7 8.5 228 8.5 228c29.1 33.5 63.1 35.6 63.1 35.6 0 0 .1-.1.1-.1 4.3 7.7 9.3 15 14.9 21.9 2.4 2.9 4.8 5.6 7.4 8.3-10.6 30.4 1.5 55.6 1.5 55.6 32.4 1.2 53.7-14.2 58.2-17.7 3.2 1.1 6.5 2.1 9.8 2.9 10 2.6 20.2 4.1 30.4 4.5 2.5.1 5.1.2 7.6.1l1.2 0 .8 0 1.6 0 1.6-.1 0 .1c15.3 21.8 42.1 24.9 42.1 24.9 19.1-20.1 20.2-40.1 20.2-44.4l0 0c0 0 0-.1 0-.3 0-.4 0-.6 0-.6l0 0c0-.3 0-.6 0-.9 4-2.8 7.8-5.8 11.4-9.1 7.6-6.9 14.3-14.8 19.9-23.3.5-.8 1-1.6 1.5-2.4 21.6 1.2 36.9-13.4 36.9-13.4-3.6-22.5-16.4-33.5-19.1-35.6l0 0c0 0-.1-.1-.3-.2-.2-.1-.2-.2-.2-.2 0 0 0 0 0 0-.1-.1-.3-.2-.5-.3.1-1.4.2-2.7.3-4.1.2-2.4.2-4.9.2-7.3l0-1.8 0-.9 0-.5c0-.6 0-.4 0-.6l-.1-1.5-.1-2c0-.7-.1-1.3-.2-1.9-.1-.6-.1-1.3-.2-1.9l-.2-1.9-.3-1.9c-.4-2.5-.8-4.9-1.4-7.4-2.3-9.7-6.1-18.9-11-27.2-5-8.3-11.2-15.6-18.3-21.8-7-6.2-14.9-11.2-23.1-14.9-8.3-3.7-16.9-6.1-25.5-7.2-4.3-.6-8.6-.8-12.9-.7l-1.6 0-.4 0c-.1 0-.6 0-.5 0l-.7 0-1.6.1c-.6 0-1.2.1-1.7.1-2.2.2-4.4.5-6.5.9-8.6 1.6-16.7 4.7-23.8 9-7.1 4.3-13.3 9.6-18.3 15.6-5 6-8.9 12.7-11.6 19.6-2.7 6.9-4.2 14.1-4.6 21-.1 1.7-.1 3.5-.1 5.2 0 .4 0 .9 0 1.3l.1 1.4c.1.8.1 1.7.2 2.5.3 3.5 1 6.9 1.9 10.1 1.9 6.5 4.9 12.4 8.6 17.4 3.7 5 8.2 9.1 12.9 12.4 4.7 3.2 9.8 5.5 14.8 7 5 1.5 10 2.1 14.7 2.1.6 0 1.2 0 1.7 0 .3 0 .6 0 .9 0 .3 0 .6 0 .9-.1.5 0 1-.1 1.5-.1.1 0 .3 0 .4-.1l.5-.1c.3 0 .6-.1.9-.1.6-.1 1.1-.2 1.7-.3.6-.1 1.1-.2 1.6-.4 1.1-.2 2.1-.6 3.1-.9 2-.7 4-1.5 5.7-2.4 1.8-.9 3.4-2 5-3 .4-.3.9-.6 1.3-1 1.6-1.3 1.9-3.7.6-5.3-1.1-1.4-3.1-1.8-4.7-.9-.4.2-.8.4-1.2.6-1.4.7-2.8 1.3-4.3 1.8-1.5.5-3.1.9-4.7 1.2-.8.1-1.6.2-2.5.3-.4 0-.8.1-1.3.1-.4 0-.9 0-1.2 0-.4 0-.8 0-1.2 0-.5 0-1 0-1.5-.1 0 0-.3 0-.1 0l-.2 0-.3 0c-.2 0-.5 0-.7-.1-.5-.1-.9-.1-1.4-.2-3.7-.5-7.4-1.6-10.9-3.2-3.6-1.6-7-3.8-10.1-6.6-3.1-2.8-5.8-6.1-7.9-9.9-2.1-3.8-3.6-8-4.3-12.4-.3-2.2-.5-4.5-.4-6.7 0-.6.1-1.2.1-1.8 0 .2 0-.1 0-.1l0-.2 0-.5c0-.3.1-.6.1-.9.1-1.2.3-2.4.5-3.6 1.7-9.6 6.5-19 13.9-26.1 1.9-1.8 3.9-3.4 6-4.9 2.1-1.5 4.4-2.8 6.8-3.9 2.4-1.1 4.8-2 7.4-2.7 2.5-.7 5.1-1.1 7.8-1.4 1.3-.1 2.6-.2 4-.2.4 0 .6 0 .9 0l1.1 0 .7 0c.3 0 0 0 .1 0l.3 0 1.1.1c2.9.2 5.7.6 8.5 1.3 5.6 1.2 11.1 3.3 16.2 6.1 10.2 5.7 18.9 14.5 24.2 25.1 2.7 5.3 4.6 11 5.5 16.9.2 1.5.4 3 .5 4.5l.1 1.1.1 1.1c0 .4 0 .8 0 1.1 0 .4 0 .8 0 1.1l0 1 0 1.1c0 .7-.1 1.9-.1 2.6-.1 1.6-.3 3.3-.5 4.9-.2 1.6-.5 3.2-.8 4.8-.3 1.6-.7 3.2-1.1 4.7-.8 3.1-1.8 6.2-3 9.3-2.4 6-5.6 11.8-9.4 17.1-7.7 10.6-18.2 19.2-30.2 24.7-6 2.7-12.3 4.7-18.8 5.7-3.2.6-6.5.9-9.8 1l-.6 0-.5 0-1.1 0-1.6 0-.8 0c.4 0-.1 0-.1 0l-.3 0c-1.8 0-3.5-.1-5.3-.3-7-.5-13.9-1.8-20.7-3.7-6.7-1.9-13.2-4.6-19.4-7.8-12.3-6.6-23.4-15.6-32-26.5-4.3-5.4-8.1-11.3-11.2-17.4-3.1-6.1-5.6-12.6-7.4-19.1-1.8-6.6-2.9-13.3-3.4-20.1l-.1-1.3 0-.3 0-.3 0-.6 0-1.1 0-.3 0-.4 0-.8 0-1.6 0-.3c0 0 0 .1 0-.1l0-.6c0-.8 0-1.7 0-2.5.1-3.3.4-6.8.8-10.2.4-3.4 1-6.9 1.7-10.3.7-3.4 1.5-6.8 2.5-10.2 1.9-6.7 4.3-13.2 7.1-19.3 5.7-12.2 13.1-23.1 22-31.8 2.2-2.2 4.5-4.2 6.9-6.2 2.4-1.9 4.9-3.7 7.5-5.4 2.5-1.7 5.2-3.2 7.9-4.6 1.3-.7 2.7-1.4 4.1-2 .7-.3 1.4-.6 2.1-.9.7-.3 1.4-.6 2.1-.9 2.8-1.2 5.7-2.2 8.7-3.1.7-.2 1.5-.4 2.2-.7.7-.2 1.5-.4 2.2-.6 1.5-.4 3-.8 4.5-1.1.7-.2 1.5-.3 2.3-.5.8-.2 1.5-.3 2.3-.5.8-.1 1.5-.3 2.3-.4l1.1-.2 1.2-.2c.8-.1 1.5-.2 2.3-.3.9-.1 1.7-.2 2.6-.3.7-.1 1.9-.2 2.6-.3.5-.1 1.1-.1 1.6-.2l1.1-.1.5-.1.6 0c.9-.1 1.7-.1 2.6-.2l1.3-.1c0 0 .5 0 .1 0l.3 0 .6 0c.7 0 1.5-.1 2.2-.1 2.9-.1 5.9-.1 8.8 0 5.8.2 11.5.9 17 1.9 11.1 2.1 21.5 5.6 31 10.3 9.5 4.6 17.9 10.3 25.3 16.5.5.4.9.8 1.4 1.2.4.4.9.8 1.3 1.2.9.8 1.7 1.6 2.6 2.4.9.8 1.7 1.6 2.5 2.4.8.8 1.6 1.6 2.4 2.5 3.1 3.3 6 6.6 8.6 10 5.2 6.7 9.4 13.5 12.7 19.9.2.4.4.8.6 1.2.2.4.4.8.6 1.2.4.8.8 1.6 1.1 2.4.4.8.7 1.5 1.1 2.3.3.8.7 1.5 1 2.3 1.2 3 2.4 5.9 3.3 8.6 1.5 4.4 2.6 8.3 3.5 11.7.3 1.4 1.6 2.3 3 2.1 1.5-.1 2.6-1.3 2.6-2.8C342.6 170.4 342.5 166.1 342 161.2z"/></svg></a>`;
  };

  /** @param {string} traceId @returns {string} */
  const traceIconHTML = (traceId) => traceLink(traceId, 'Engine trace in Grafana');

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

  /**
   * @param {Workflow} wf
   * @param {boolean} [isStatic]
   * @returns {string}
   */
  const buildCardHTML = (wf, isStatic) => {
    const { instance: inst } = wf;
    const retries = wf.steps.reduce((sum, s) => sum + s.retryCount, 0);
    const tx = parseTransition(wf);
    const wfLabel = tx ? `${tx.from || 'Start Event'} \u2192 ${tx.to}` : wf.operationId;

    let html = `<div class="card-header">`;
    html += `<span class="seg" onclick="toggleOrgFilter('${esc(inst.org)}')" title="Filter by org">${esc(inst.org)}</span>`;
    html += `<span class="seg-sep">/</span>`;
    html += `<span class="seg" onclick="toggleAppFilter('${esc(inst.app)}')" title="Filter by app">${esc(inst.app)}</span>`;
    html += `<span class="seg-sep">/</span>`;
    html += `<span class="seg" onclick="togglePartyFilter('${inst.instanceOwnerPartyId}')" title="Filter by party">${inst.instanceOwnerPartyId}</span>`;
    html += `<span class="seg-sep">/</span>`;
    html += `<span class="seg guid" onclick="toggleGuidFilter('${esc(inst.instanceGuid)}')" title="Filter by instance">${esc(inst.instanceGuid)}</span>`;
    html += `<span class="wf-name">${esc(wfLabel)}</span>`;
    html += `<span class="header-spacer"></span>`;
    if (retries > 0) html += `<span class="retry-badge">&#8635;${retries}</span>`;
    html += `<span class="status-pill ${wf.status}"${isStatic ? ' style="animation:none"' : ''}>${wf.status}</span>`;
    if (!isStatic) {
      html += `<span class="elapsed" data-timer="${esc(wf.idempotencyKey)}">0.0s</span>`;
    } else if (wf.executionStartedAt) {
      const end = wf.removedAt || wf.steps.at(-1)?.updatedAt;
      if (end) {
        const dur = (new Date(end) - new Date(wf.executionStartedAt)) / 1000;
        const label = dur < 1 ? `${(dur * 1000).toFixed(0)}ms` : formatElapsed(dur);
        html += `<span class="elapsed">${label}</span>`;
      }
    }
    html += copyIconHTML(inst.instanceGuid);
    html += openIconHTML(inst);
    if (wf.traceId) html += traceIconHTML(wf.traceId);
    html += `</div>`;

    html += buildPipelineHTML(wf, isStatic);
    return html;
  };

  /**
   * Compact card: single row with tiny step dots, no labels/connectors.
   * @param {Workflow} wf
   * @param {boolean} [isStatic]
   * @returns {string}
   */
  const buildCompactCardHTML = (wf, isStatic) => {
    const { instance: inst } = wf;
    const retries = wf.steps.reduce((sum, s) => sum + s.retryCount, 0);
    const tx = parseTransition(wf);
    const wfLabel = tx ? `${tx.from || 'Start Event'} \u2192 ${tx.to}` : wf.operationId;

    let html = `<div class="compact-row">`;
    html += `<span class="seg" onclick="toggleOrgFilter('${esc(inst.org)}')" title="Filter by org">${esc(inst.org)}</span>`;
    html += `<span class="seg-sep">/</span>`;
    html += `<span class="seg" onclick="toggleAppFilter('${esc(inst.app)}')" title="Filter by app">${esc(inst.app)}</span>`;
    html += `<span class="seg-sep">/</span>`;
    html += `<span class="seg" onclick="togglePartyFilter('${inst.instanceOwnerPartyId}')" title="Filter by party">${inst.instanceOwnerPartyId}</span>`;
    html += `<span class="seg-sep">/</span>`;
    html += `<span class="seg guid" onclick="toggleGuidFilter('${esc(inst.instanceGuid)}')" title="Filter by instance">${esc(inst.instanceGuid)}</span>`;
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

    if (!isStatic) {
      html += `<span class="elapsed" data-timer="${esc(wf.idempotencyKey)}">0.0s</span>`;
    } else if (wf.executionStartedAt) {
      const end = wf.removedAt || wf.steps.at(-1)?.updatedAt;
      if (end) {
        const dur = (new Date(end) - new Date(wf.executionStartedAt)) / 1000;
        const label = dur < 1 ? `${(dur * 1000).toFixed(0)}ms` : formatElapsed(dur);
        html += `<span class="elapsed">${label}</span>`;
      }
    }

    html += copyIconHTML(inst.instanceGuid);
    html += openIconHTML(inst);
    if (wf.traceId) html += traceIconHTML(wf.traceId);
    html += `</div>`;
    return html;
  };

  /**
   * Compact scheduled card variant.
   * @param {Workflow} wf
   * @returns {string}
   */
  const buildCompactScheduledCardHTML = (wf) => {
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

  /* ============================================================
   *  11. PIPELINE RENDERING  (step circles + connectors)
   * ============================================================ */

  /**
   * @param {Workflow} wf
   * @param {boolean} [isStatic]
   * @returns {string}
   */
  const buildPipelineHTML = (wf, isStatic) => {
    const { steps } = wf;
    if (!steps?.length) return '';

    const tx = parseTransition(wf);

    // No grouping for non-"next" workflows
    if (!tx) {
      let html = '<div class="pipeline">';
      steps.forEach((step, i) => {
        if (i > 0) html += buildConnectorHTML(steps[i - 1], step, isStatic);
        html += buildStepNodeHTML(wf, step, isStatic);
      });
      html += '</div>';
      return html;
    }

    // Flat pipeline with phase annotations on step-nodes
    const phases = steps.map(s => stepPhase(s.commandDetail));
    /** @param {string} phase @returns {string} */
    const phaseLabel = (phase) => {
      if (phase === 'end') return tx.from;
      if (phase === 'start') return tx.to;
      if (phase === 'commit') return 'commit';
      if (phase === 'post') return 'post-commit';
      return '';
    };

    // Find the middle index of each phase group for centered labels
    // Map: stepIndex → needsHalfOffset (true for even-count groups)
    const labelAt = new Map();
    let groupStart = -1;
    let groupPhase = null;
    for (let i = 0; i <= steps.length; i++) {
      const p = i < steps.length ? phases[i] : null;
      if (p !== groupPhase) {
        if (groupPhase !== null && groupStart >= 0) {
          const count = i - groupStart;
          const mid = groupStart + Math.floor((count - 1) / 2);
          labelAt.set(mid, count % 2 === 0);
        }
        groupStart = p !== null ? i : -1;
        groupPhase = p;
      }
    }

    let html = '<div class="pipeline pipeline-grouped">';
    steps.forEach((step, i) => {
      if (i > 0) html += buildConnectorHTML(steps[i - 1], step, isStatic);

      const phase = phases[i];
      const isFirst = phase !== null && phase !== (i > 0 ? phases[i - 1] : null);
      const isLast  = phase !== null && phase !== (i < steps.length - 1 ? phases[i + 1] : null);

      const hasLabel = labelAt.has(i);
      html += buildStepNodeHTML(wf, step, isStatic,
        phase ? { phase, first: isFirst, last: isLast, label: hasLabel ? phaseLabel(phase) : null, halfOffset: hasLabel && labelAt.get(i) } : null);
    });
    html += '</div>';
    return html;
  };

  /**
   * @param {Step} prev
   * @param {Step} cur
   * @param {boolean} [isStatic]
   * @returns {string}
   */
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

  /**
   * @param {StepStatus} status
   * @returns {string}
   */
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

  /**
   * @param {Step} step
   * @param {boolean} [isStatic]
   * @returns {string}
   */
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

  /**
   * @param {string} wfKey
   * @param {Step} step
   * @param {boolean} [isStatic]
   * @param {{ phase: string, first: boolean, last: boolean, label: string|null, halfOffset: boolean }} [phaseOpts]
   * @returns {string}
   */
  const buildStepNodeHTML = (wf, step, isStatic, phaseOpts) => {
    let attrs = '';
    let labelHtml = '';
    if (phaseOpts) {
      attrs = ` data-phase="${phaseOpts.phase}"`;
      if (phaseOpts.first) attrs += ' data-phase-first';
      if (phaseOpts.last) attrs += ' data-phase-last';
      if (phaseOpts.label) labelHtml = `<span class="phase-label${phaseOpts.halfOffset ? ' phase-label-offset' : ''}">${escHtml(phaseOpts.label)}</span>`;
    }
    let html = `<div class="step-node"${attrs}>`;
    html += labelHtml;

    html += `<div class="step-circle ${step.status}"`
      + ` style="cursor:pointer${isStatic ? ';animation:none;box-shadow:none' : ''}"`
      + ` onclick="openStepModal('${esc(wf.idempotencyKey)}','${esc(step.idempotencyKey)}','${esc(step.commandDetail)}','${esc(wf.createdAt)}')">`
      + `${stepIcon(step.status)}</div>`;

    const sub = stepSubLabel(step);
    html += `<div class="step-label-wrap">`;
    html += `<div class="step-label" title="${esc(step.commandDetail)}">${esc(step.commandDetail)}</div>`;
    if (sub) html += `<div class="step-sublabel">${esc(sub)}</div>`;
    html += `</div>`;

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

  /** @param {HTMLElement} card */
  const scrollPipelineToActive = (card) => {
    const p = card.querySelector('.pipeline');
    if (!p) return;
    const active = p.querySelector('.step-circle.Processing') || p.querySelector('.step-circle.Requeued');
    if (active) {
      const node = /** @type {HTMLElement | null} */ (active.closest('.step-node'));
      if (node) {
        // @ts-ignore — scrollLeft exists on Element but TS wants HTMLElement
        p.scrollLeft = Math.max(0, node.offsetLeft - p.offsetLeft - (p.clientWidth / 2) + (node.offsetWidth / 2));
        return;
      }
    }
    // @ts-ignore
    p.scrollLeft = p.scrollWidth;
  };

  /* ============================================================
   *  12. TIMERS  (workflow elapsed + step backoff countdowns)
   * ============================================================ */

  /** @param {number} seconds */
  const formatElapsed = (seconds) => {
    if (seconds < 60)   return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const updateTimers = () => {
    const now = Date.now();

    for (const el of document.querySelectorAll('[data-timer]')) {
      const timer = state.workflowTimers[el.getAttribute('data-timer') ?? ''];
      if (timer) {
        const end = timer.frozenAt || now;
        el.textContent = formatElapsed((end - new Date(timer.startedAt).getTime()) / 1000);
      }
    }

    for (const el of document.querySelectorAll('[data-backoff]')) {
      const remaining = (new Date(el.getAttribute('data-backoff') ?? '').getTime() - now) / 1000;
      el.textContent = remaining > 0 ? `retry ${remaining.toFixed(1)}s` : 'retrying...';
    }

    for (const el of document.querySelectorAll('[data-starts-at]')) {
      const remaining = (new Date(el.getAttribute('data-starts-at') ?? '').getTime() - now) / 1000;
      el.textContent = remaining > 0 ? `starts in ${formatElapsed(remaining)}` : 'starting...';
    }

    requestAnimationFrame(updateTimers);
  };

  /* ============================================================
   *  13. FILTERING
   * ============================================================ */

  /** @param {Workflow} wf @returns {string} */
  const buildFilterText = (wf) => {
    const parts = [wf.instance.org, wf.instance.app, wf.instance.instanceOwnerPartyId, wf.instance.instanceGuid, wf.operationId];
    for (const s of wf.steps) parts.push(s.commandDetail, s.operationId);
    return parts.join(' ').toLowerCase();
  };

  /** @param {Workflow} wf @returns {string} */
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

  /** @param {HTMLElement} card @param {Workflow} wf */
  const setCardFilterData = (card, wf) => {
    card.dataset.wfkey = wf.idempotencyKey;
    workflowData[wf.idempotencyKey] = wf;
    card.dataset.filter = buildFilterText(wf);
    card.dataset.status = buildStatusTags(wf);
    card.dataset.org = wf.instance.org.toLowerCase();
    card.dataset.app = wf.instance.app.toLowerCase();
    card.dataset.party = String(wf.instance.instanceOwnerPartyId);
    card.dataset.guid = wf.instance.instanceGuid.toLowerCase();
  };

  /** @returns {boolean} */
  const hasActiveFilter = () =>
    !!(state.liveFilter || state.querySearch || state.sectionStatus.scheduled || state.sectionStatus.live || state.sectionStatus.recent || state.sectionStatus.query || state.orgFilter.size || state.appFilter.size || state.partyFilter.size || state.guidFilter.size);

  const applyFilter = () => {
    const lf = state.liveFilter;
    const of_ = state.orgFilter;
    const af = state.appFilter;
    const pf = state.partyFilter;
    const gf = state.guidFilter;
    /**
     * @param {HTMLElement} container
     * @param {HTMLElement | null} countEl
     * @param {string} sectionStatus
     * @param {boolean} [isLiveTab]
     */
    const filterContainer = (container, countEl, sectionStatus, isLiveTab) => {
      const cards = /** @type {HTMLElement[]} */ ([...container.querySelectorAll('.workflow-card')]);
      let matched = 0;
      /** @type {Record<string, number>} */
      const statusCounts = {};
      for (const card of cards) {
        const textHidden = isLiveTab && lf && !(card.dataset.filter || '').includes(lf);
        const statusHidden = sectionStatus && !(card.dataset.status || '').includes(sectionStatus);
        const orgHidden = of_.size > 0 && !of_.has(card.dataset.org || '');
        const appHidden = af.size > 0 && !af.has(card.dataset.app || '');
        const partyHidden = isLiveTab && pf.size > 0 && !pf.has(card.dataset.party || '');
        const guidHidden = isLiveTab && gf.size > 0 && !gf.has(card.dataset.guid || '');
        const hidden = textHidden || statusHidden || orgHidden || appHidden || partyHidden || guidHidden;
        card.classList.toggle('filtered-out', hidden);
        if (!hidden) matched++;
        for (const tag of (card.dataset.status || '').toLowerCase().split(' ')) {
          if (tag) statusCounts[tag] = (statusCounts[tag] || 0) + 1;
        }
      }
      if (countEl) {
        const hasFilter = (isLiveTab && lf) || sectionStatus || of_.size > 0 || af.size > 0 || (isLiveTab && pf.size > 0) || (isLiveTab && gf.size > 0);
        countEl.textContent = (hasFilter && cards.length > 0) ? `${matched} / ${cards.length}` : `${cards.length}`;
      }
      // Update chip counts (skip for query toggle chips — they have no counts)
      const section = container.closest('.section')?.querySelector('.section-chips') ||
                       container.parentElement?.querySelector('.section-chips');
      if (section && !section.classList.contains('query-toggle')) {
        for (const chip of section.querySelectorAll('.chip')) {
          const st = /** @type {HTMLElement} */ (chip).dataset.status || '';
          const label = /** @type {HTMLElement} */ (chip).dataset.label ||
                        (/** @type {HTMLElement} */ (chip).dataset.label = (chip.textContent?.trim() || '').replace(/\s*\(.*\)$/, ''));
          if (!st) {
            chip.textContent = `${label} (${cards.length})`;
          } else {
            chip.textContent = `${label} (${statusCounts[st] || 0})`;
          }
        }
      }
    };
    filterContainer(dom.scheduledContainer, null, state.sectionStatus.scheduled, true);
    filterContainer(dom.liveContainer, null, state.sectionStatus.live, true);
    filterContainer(dom.recentContainer, null, state.sectionStatus.recent, true);
    filterContainer(dom.queryContainer, null, state.sectionStatus.query, false);
  };

  /** @param {string} value */
  const setLiveFilter = (value) => {
    state.liveFilter = value.toLowerCase();
    dom.liveFilterInput.value = value;
    dom.liveFilterClear.classList.toggle('visible', value.length > 0);
    applyFilter();
  };

  /** @param {string} org */
  const toggleOrgFilter = (org) => {
    const v = org.toLowerCase();
    const sole = state.orgFilter.size === 1 && state.orgFilter.has(v);
    state.orgFilter.clear();
    if (!sole) state.orgFilter.add(v);
    const allOrgs = new Set(state.orgsAndApps.keys());
    rebuildDropdown(dom.orgList, allOrgs, state.orgFilter);
    updateDropdownToggle('org');
    refreshAppDropdown(); // gate apps behind org
    applyFilter();
    syncUrl();
    if (state.queryLoaded) loadQuery();
  };

  /** @param {string} app */
  const toggleAppFilter = (app) => {
    const v = app.toLowerCase();
    const sole = state.appFilter.size === 1 && state.appFilter.has(v);
    state.appFilter.clear();
    if (!sole) state.appFilter.add(v);
    const availableApps = getAppsForSelectedOrgs();
    rebuildDropdown(dom.appList, availableApps, state.appFilter);
    updateDropdownToggle('app');
    applyFilter();
    syncUrl();
    if (state.queryLoaded) loadQuery();
  };

  /** @param {string} party */
  const togglePartyFilter = (party) => {
    const v = party.toLowerCase();
    const sole = state.partyFilter.size === 1 && state.partyFilter.has(v);
    state.partyFilter.clear();
    if (!sole) state.partyFilter.add(v);
    rebuildSelectedOnlyChips(dom.partyChips, state.partyFilter, 'party-chip');
    updatePartyGuidLabels();
    applyFilter();
    syncUrl();
    if (state.queryLoaded) loadQuery();
  };

  /** @param {string} guid */
  const toggleGuidFilter = (guid) => {
    const v = guid.toLowerCase();
    const sole = state.guidFilter.size === 1 && state.guidFilter.has(v);
    state.guidFilter.clear();
    if (!sole) state.guidFilter.add(v);
    rebuildSelectedOnlyChips(dom.guidChips, state.guidFilter, 'guid-chip', v => v.substring(0, 8));
    updatePartyGuidLabels();
    applyFilter();
    syncUrl();
    if (state.queryLoaded) loadQuery();
  };

  /* ── Searchable dropdown helpers ─────────────────────────── */

  /**
   * Rebuild dropdown list items.
   * @param {HTMLElement} listEl
   * @param {Set<string>} allValues
   * @param {Set<string>} filterSet
   */
  const rebuildDropdown = (listEl, allValues, filterSet) => {
    const sorted = [...allValues].sort();
    listEl.innerHTML = '';
    // Action row: Select all / Clear all
    if (sorted.length > 0) {
      const row = document.createElement('div');
      row.className = 'dropdown-actions';
      const selAll = document.createElement('span');
      selAll.className = 'dropdown-action';
      selAll.textContent = 'Select all';
      selAll.dataset.action = 'select-all';
      if (filterSet.size === sorted.length) selAll.classList.add('dim');
      const clearAll = document.createElement('span');
      clearAll.className = 'dropdown-action';
      clearAll.textContent = 'Clear all';
      clearAll.dataset.action = 'clear';
      if (filterSet.size === 0) clearAll.classList.add('dim');
      row.appendChild(selAll);
      row.appendChild(clearAll);
      listEl.appendChild(row);
    }
    for (const v of sorted) {
      const item = document.createElement('div');
      item.className = `dropdown-item${filterSet.has(v) ? ' selected' : ''}`;
      item.dataset.value = v;
      item.textContent = v;
      listEl.appendChild(item);
    }
  };

  /**
   * Update the toggle button to show selected chips.
   * @param {'org' | 'app'} which
   */
  const updateDropdownToggle = (which) => {
    const filterSet = which === 'org' ? state.orgFilter : state.appFilter;
    const selectedEl = which === 'org' ? dom.orgSelected : dom.appSelected;
    const dropdown = which === 'org' ? dom.orgDropdown : dom.appDropdown;

    if (filterSet.size === 0) {
      selectedEl.innerHTML = '';
      dropdown.classList.remove('has-selection');
    } else {
      selectedEl.innerHTML = [...filterSet].sort().map(v => `<span class="mini-chip">${esc(v)}</span>`).join('');
      dropdown.classList.add('has-selection');
    }
  };

  /** @param {string} dropdownId */
  window.toggleDropdown = (dropdownId) => {
    const el = document.getElementById(dropdownId);
    if (!el) return;
    if (el.classList.contains('disabled')) return;
    const wasOpen = el.classList.contains('open');
    // Close all dropdowns first
    for (const d of document.querySelectorAll('.dropdown.open')) d.classList.remove('open');
    if (!wasOpen) {
      el.classList.add('open');
      const search = el.querySelector('.dropdown-search');
      if (search) { /** @type {HTMLInputElement} */ (search).value = ''; /** @type {HTMLInputElement} */ (search).focus(); filterDropdownList(el, ''); }
    }
  };

  /** @param {HTMLElement} dropdown @param {string} query */
  const filterDropdownList = (dropdown, query) => {
    const q = query.toLowerCase();
    for (const item of dropdown.querySelectorAll('.dropdown-item')) {
      /** @type {HTMLElement} */ (item).classList.toggle('hidden', q !== '' && !(/** @type {HTMLElement} */ (item).dataset.value || '').includes(q));
    }
  };

  // Wire dropdown search inputs
  for (const dd of document.querySelectorAll('.dropdown')) {
    const searchInput = dd.querySelector('.dropdown-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => filterDropdownList(/** @type {HTMLElement} */ (dd), /** @type {HTMLInputElement} */ (e.target).value));
      searchInput.addEventListener('click', (e) => e.stopPropagation());
    }
    const list = dd.querySelector('.dropdown-list');
    if (list) {
      list.addEventListener('click', (e) => {
        e.stopPropagation(); // keep dropdown open for multi-select
        const target = /** @type {HTMLElement} */ (e.target);
        // Handle action row (Select all / Clear all)
        if (target.classList.contains('dropdown-action')) {
          const action = target.dataset.action;
          if (dd.id === 'org-dropdown') {
            if (action === 'clear') state.orgFilter.clear();
            else if (action === 'select-all') for (const k of state.orgsAndApps.keys()) state.orgFilter.add(k);
            refreshOrgAppDropdowns(); refreshAppDropdown(); applyFilter(); syncUrl(); if (state.queryLoaded) loadQuery();
          } else if (dd.id === 'app-dropdown') {
            const avail = getAppsForSelectedOrgs();
            if (action === 'clear') state.appFilter.clear();
            else if (action === 'select-all') for (const a of avail) state.appFilter.add(a);
            rebuildDropdown(dom.appList, avail, state.appFilter); updateDropdownToggle('app'); applyFilter(); syncUrl(); if (state.queryLoaded) loadQuery();
          }
          return;
        }
        const item = /** @type {HTMLElement | null} */ (target.closest('.dropdown-item'));
        if (!item) return;
        const v = item.dataset.value || '';
        if (dd.id === 'org-dropdown') toggleOrgFilter(v);
        else if (dd.id === 'app-dropdown') toggleAppFilter(v);
      });
    }
  }

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target.closest('.dropdown')) {
      for (const d of document.querySelectorAll('.dropdown.open')) d.classList.remove('open');
    }
  });

  /** Merge org/app values discovered from SSE into dropdown lists. */
  const mergeDiscoveredOrgsAndApps = () => {
    let changed = false;
    for (const card of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.workflow-card[data-org]'))) {
      const o = card.dataset.org;
      const a = card.dataset.app;
      if (o && a && addOrgAndApp(o, a)) changed = true;
    }
    if (changed) refreshOrgAppDropdowns();
  };

  /**
   * Rebuild chips from selection only (not all visible cards).
   * @param {HTMLElement} container
   * @param {Set<string>} filterSet
   * @param {string} chipClass
   * @param {(v: string) => string} [labelFn]
   */
  const rebuildSelectedOnlyChips = (container, filterSet, chipClass, labelFn) => {
    const sorted = [...filterSet].sort();
    const prev = container.dataset.values || '';
    const next = sorted.join(',');
    if (prev === next) return;
    container.dataset.values = next;
    container.innerHTML = '';
    for (const v of sorted) {
      const btn = document.createElement('button');
      btn.className = `chip ${chipClass} active`;
      btn.dataset.value = v;
      btn.textContent = labelFn ? labelFn(v) : v;
      btn.title = v;
      container.appendChild(btn);
    }
  };

  const updatePartyGuidLabels = () => {
    /** @type {HTMLElement} */ (document.getElementById('label-party')).style.display = state.partyFilter.size > 0 ? '' : 'none';
    /** @type {HTMLElement} */ (document.getElementById('label-guid')).style.display = state.guidFilter.size > 0 ? '' : 'none';
  };

  // Expose for inline onclick
  // @ts-ignore
  window.toggleOrgFilter = toggleOrgFilter;
  // @ts-ignore
  window.toggleAppFilter = toggleAppFilter;
  // @ts-ignore
  window.togglePartyFilter = togglePartyFilter;
  // @ts-ignore
  window.toggleGuidFilter = toggleGuidFilter;

  dom.liveFilterInput.addEventListener('input', () => setLiveFilter(dom.liveFilterInput.value));
  dom.liveFilterClear.addEventListener('click', () => { setLiveFilter(''); dom.liveFilterInput.focus(); });

  // Query search — triggers on Enter key
  dom.querySearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      state.querySearch = dom.querySearchInput.value.trim();
      syncUrl();
      if (state.queryLoaded) loadQuery();
    }
  });

  /** @param {HTMLElement} container @param {(value: string) => void} toggle */
  const wireChipBar = (container, toggle) => {
    container.addEventListener('click', (e) => {
      const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.chip'));
      if (!chip) return;
      toggle(chip.dataset.value || '');
    });
  };
  wireChipBar(dom.partyChips, togglePartyFilter);
  wireChipBar(dom.guidChips, toggleGuidFilter);

  for (const bar of document.querySelectorAll('.section-chips')) {
    const isQueryToggle = bar.classList.contains('query-toggle');
    bar.addEventListener('click', (e) => {
      const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.chip'));
      if (!chip) return;
      const section = /** @type {HTMLElement} */ (bar).dataset.section || '';

      if (isQueryToggle) {
        // Multi-select toggle: click toggles individual chips on/off
        chip.classList.toggle('active');
        // If none active, reset both to active (can't deselect everything)
        const activeChips = bar.querySelectorAll('.chip.active');
        if (activeChips.length === 0) {
          for (const c of bar.querySelectorAll('.chip')) c.classList.add('active');
        }
        // Derive sectionStatus: both active = '' (all), one active = that value
        const active = [...bar.querySelectorAll('.chip.active')];
        state.sectionStatus.query = active.length >= 2 ? '' : (/** @type {HTMLElement} */ (active[0]).dataset.status || '');
      } else {
        // Radio-style: one active at a time
        const value = chip.dataset.status || '';
        state.sectionStatus[section] = value;
        for (const c of bar.querySelectorAll('.chip')) c.classList.toggle('active', c === chip);
      }

      applyFilter();
      syncUrl();
      if (section === 'query' && state.queryLoaded) loadQuery();
    });
  }

  // Time range dropdown
  /** @type {{ from: string, to: string } | null} */
  let customTimeRange = null;

  const timeLabels = { 0:'All time', 5:'5m', 15:'15m', 30:'30m', 60:'1h', 360:'6h', 1440:'24h', 10080:'7d' };

  /** Format a Date as local `YYYY-MM-DDTHH:MM` for datetime-local inputs. */
  const toLocalDatetime = (d) => {
    const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const updateTimeLabel = () => {
    const label = /** @type {HTMLElement} */ (document.getElementById('time-range-label'));
    const btn = /** @type {HTMLElement} */ (document.getElementById('time-range-btn'));
    if (customTimeRange) {
      label.textContent = 'Custom';
      btn.classList.add('has-range');
    } else if (queryTimeRange > 0) {
      label.textContent = timeLabels[queryTimeRange] || `${queryTimeRange}m`;
      btn.classList.add('has-range');
    } else {
      label.textContent = 'All time';
      btn.classList.remove('has-range');
    }
  };

  window.toggleTimeDropdown = () => {
    document.getElementById('time-dropdown')?.classList.toggle('open');
  };

  document.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target.closest('.time-range-group')) document.getElementById('time-dropdown')?.classList.remove('open');
    if (!target.closest('.refresh-group')) document.getElementById('refresh-dropdown')?.classList.remove('open');
  });

  document.getElementById('time-dropdown')?.addEventListener('click', (e) => {
    const opt = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.time-option'));
    if (!opt) return;
    const minutes = opt.dataset.minutes || '0';
    if (minutes === 'custom') {
      document.getElementById('time-custom').style.display = '';
      // Pre-fill with current range or sensible defaults
      const now = new Date();
      const from = new Date(now.getTime() - 3600000);
      /** @type {HTMLInputElement} */ (document.getElementById('time-from')).value = toLocalDatetime(from);
      /** @type {HTMLInputElement} */ (document.getElementById('time-to')).value = toLocalDatetime(now);
      return;
    }
    document.getElementById('time-custom').style.display = 'none';
    customTimeRange = null;
    queryTimeRange = parseInt(minutes, 10);
    const dropdown = document.getElementById('time-dropdown');
    if (dropdown) for (const o of dropdown.querySelectorAll('.time-option')) o.classList.toggle('active', o === opt);
    dropdown?.classList.remove('open');
    updateTimeLabel();
    syncUrl();
    if (state.queryLoaded) loadQuery();
  });

  window.applyCustomTimeRange = () => {
    const from = /** @type {HTMLInputElement} */ (document.getElementById('time-from')).value;
    const to = /** @type {HTMLInputElement} */ (document.getElementById('time-to')).value;
    if (!from || !to) return;
    customTimeRange = { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
    queryTimeRange = 0;
    const dropdown = document.getElementById('time-dropdown');
    if (dropdown) {
      for (const o of dropdown.querySelectorAll('.time-option')) {
        o.classList.toggle('active', (/** @type {HTMLElement} */ (o).dataset.minutes) === 'custom');
      }
    }
    dropdown?.classList.remove('open');
    updateTimeLabel();
    syncUrl();
    if (state.queryLoaded) loadQuery();
  };

  // Retried checkbox (query only)
  window.toggleRetried = () => {
    syncUrl();
    if (state.queryLoaded) loadQuery();
  };

  // Auto-refresh dropdown
  /** @type {number} */
  let refreshInterval = 0;
  /** @type {ReturnType<typeof setInterval> | null} */
  let refreshTimer = null;

  window.toggleRefreshDropdown = () => {
    document.getElementById('refresh-dropdown')?.classList.toggle('open');
  };

  document.getElementById('refresh-dropdown')?.addEventListener('click', (e) => {
    const opt = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.refresh-option'));
    if (!opt) return;
    const seconds = parseInt(opt.dataset.interval || '0', 10);
    refreshInterval = seconds;

    // Update active state
    const dropdown = document.getElementById('refresh-dropdown');
    if (dropdown) for (const o of dropdown.querySelectorAll('.refresh-option')) o.classList.toggle('active', o === opt);
    dropdown?.classList.remove('open');

    // Style the whole refresh group when auto-refresh is active
    document.getElementById('refresh-dropdown-btn')?.classList.toggle('active-interval', seconds > 0);
    document.getElementById('query-load')?.classList.toggle('active-interval', seconds > 0);
    const intervalLabel = document.getElementById('refresh-interval-label');
    if (intervalLabel) intervalLabel.textContent = seconds > 0 ? opt.textContent || '' : '';

    // Clear existing timer
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }

    // Start new timer
    if (seconds > 0 && state.queryLoaded) {
      loadQuery();
      refreshTimer = setInterval(() => { if (state.queryLoaded) loadQuery(); }, seconds * 1000);
    }
  });

  /* ============================================================
   *  13b. COMPACT VIEW TOGGLE
   * ============================================================ */

  /** @param {string} section */
  window.collapseAll = (section) => {
    state.compactSections[section] = true;
    try { localStorage.setItem(`compact:${section}`, '1'); } catch { /* ignore */ }
    rebuildSectionCards(section);
    syncUrl();
  };

  /** @param {string} section */
  window.fullAll = (section) => {
    state.compactSections[section] = false;
    try { localStorage.setItem(`compact:${section}`, '0'); } catch { /* ignore */ }
    rebuildSectionCards(section);
    syncUrl();
  };

  /** @param {string} section */
  const rebuildSectionCards = (section) => {
    const compact = state.compactSections[section];
    if (section === 'inbox') {
      for (const [key, wf] of Object.entries(state.previousWorkflows)) {
        const card = document.getElementById(`wf-${cssId(key)}`);
        if (card && !card.dataset.exiting) {
          card.className = `workflow-card${compact ? ' compact' : ''}`;
          card.innerHTML = compact ? buildCompactCardHTML(wf) : buildCardHTML(wf);
          setCardFilterData(card, wf);
          if (!compact) scrollPipelineToActive(card);
        }
      }
    } else if (section === 'recent') {
      for (const wf of state.recentWorkflows) {
        const card = document.getElementById(`wf-recent-${cssId(wf.idempotencyKey)}`);
        if (card) {
          card.className = `workflow-card${compact ? ' compact' : ''}`;
          card.innerHTML = compact ? buildCompactCardHTML(wf, true) : buildCardHTML(wf, true);
          setCardFilterData(card, wf);
        }
      }
    } else if (section === 'scheduled') {
      if (!dom.scheduledSection.classList.contains('collapsed')) loadScheduled();
    } else if (section === 'query') {
      if (state.queryLoaded) loadQuery();
    }
  };

  /* ============================================================
   *  13c. COMPACT CARD EXPAND/COLLAPSE (click to toggle)
   * ============================================================ */

  /**
   * @param {HTMLElement} container
   * @param {string} section
   * @param {boolean} isStatic
   * @param {boolean} [isScheduled]
   */
  const setupCardExpand = (container, section, isStatic, isScheduled) => {
    container.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (target.closest('.seg, .compact-dot, .step-circle, .open-btn, a, button, .pipeline, .compact-pipeline')) return;

      const card = /** @type {HTMLElement | null} */ (target.closest('.workflow-card'));
      if (!card) return;

      const wf = workflowData[card.dataset.wfkey || ''];
      if (!wf) return;

      const isCompact = card.classList.contains('compact');
      if (isCompact) {
        card.className = 'workflow-card';
        card.style.animation = 'none';
        card.innerHTML = isScheduled ? buildScheduledCardHTML(wf) : buildCardHTML(wf, isStatic);
        if (!isStatic) scrollPipelineToActive(card);
      } else {
        card.className = 'workflow-card compact';
        card.style.animation = 'none';
        card.innerHTML = isScheduled ? buildCompactScheduledCardHTML(wf) : buildCompactCardHTML(wf, isStatic);
      }
      setCardFilterData(card, wf);
      syncUrl();
    });
  };

  setupCardExpand(dom.liveContainer, 'inbox', false);
  setupCardExpand(dom.recentContainer, 'recent', true);
  setupCardExpand(dom.scheduledContainer, 'scheduled', true, true);
  setupCardExpand(dom.queryContainer, 'query', true);

  /* ============================================================
   *  14. TABS
   * ============================================================ */

  /** @param {string} tabName */
  window.switchTab = (tabName) => {
    for (const t of document.querySelectorAll('.tab')) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    }
    for (const p of document.querySelectorAll('.tab-panel')) {
      p.classList.toggle('active', p.id === `panel-${tabName}`);
    }
    if (tabName === 'query') {
      state.queryLoaded = true;
      loadQuery();
    }
    syncUrl();
  };

  /* ============================================================
   *  15. QUERY  (on-demand DB fetch)
   * ============================================================ */

  const QUERY_PAGE = 100;
  /** @type {number} Time range in minutes, 0 = all time */
  let queryTimeRange = 0;

  // Pagination state
  let queryPage = 0;
  /** @type {(string | null)[]} Cursor for each page boundary: pageCursors[0]=null (first page), pageCursors[1]=cursor after page 0, etc. */
  let queryPageCursors = [null];
  let queryTotalCount = 0;

  /** Update pager UI */
  const updatePager = (pageSize, totalCount) => {
    queryTotalCount = totalCount;
    const pager = document.getElementById('query-pager');
    const info = document.getElementById('pager-info');
    const prev = /** @type {HTMLButtonElement} */ (document.getElementById('pager-prev'));
    const next = /** @type {HTMLButtonElement} */ (document.getElementById('pager-next'));
    if (!pager || !info) return;

    pager.style.display = '';
    if (totalCount === 0) {
      info.textContent = '0 of 0';
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    const from = queryPage * QUERY_PAGE + 1;
    const to = Math.min(from + pageSize - 1, totalCount);
    info.textContent = `${from.toLocaleString()}\u2013${to.toLocaleString()} of ${totalCount.toLocaleString()}`;
    prev.disabled = queryPage === 0;
    next.disabled = to >= totalCount;
  };

  /** @param {{ page?: number }} [opts] */
  const fetchQuery = async (opts) => {
    const page = opts?.page ?? 0;
    const hs = state.sectionStatus.query;
    const searchTerm = state.querySearch;
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);
    const retried = /** @type {HTMLInputElement} */ (document.getElementById('retried-check')).checked;

    // When searching for a specific GUID, bypass all filters for best results
    const dbStatus = isGuid ? '' : (hs === 'failed' ? 'failed' : hs === 'completed' ? 'completed' : '');
    const effectiveCustom = isGuid ? null : customTimeRange;
    const effectiveTimeRange = isGuid ? 0 : queryTimeRange;
    const effectiveRetried = isGuid ? false : retried;

    const btn = /** @type {HTMLButtonElement} */ (document.getElementById('query-load'));
    btn.disabled = true;
    btn.classList.add('spinning');
    const spinStart = Date.now();

    try {
      const params = new URLSearchParams();
      params.set('limit', String(QUERY_PAGE));
      if (dbStatus) params.set('status', dbStatus);
      if (searchTerm) params.set('search', searchTerm);
      if (!isGuid && state.orgFilter.size === 1) params.set('org', [...state.orgFilter][0]);
      if (!isGuid && state.appFilter.size === 1) params.set('app', [...state.appFilter][0]);
      if (!isGuid && state.partyFilter.size === 1) params.set('party', [...state.partyFilter][0]);
      if (!isGuid && state.guidFilter.size === 1) params.set('instanceGuid', [...state.guidFilter][0]);
      // Use page cursor for navigation
      const cursor = queryPageCursors[page] ?? null;
      if (cursor) params.set('before', cursor);
      if (effectiveCustom) {
        params.set('since', effectiveCustom.from);
        if (page === 0 && !cursor) params.set('before', effectiveCustom.to);
      } else if (effectiveTimeRange > 0) {
        params.set('since', new Date(Date.now() - effectiveTimeRange * 60000).toISOString());
      }
      if (effectiveRetried) params.set('retried', 'true');
      const res = await fetch(`${engineUrl}/dashboard/query?${params}`);
      const body = await res.json();
      /** @type {Workflow[]} */
      let workflows = body.workflows;
      let totalCount = /** @type {number} */ (body.totalCount);

      dom.queryContainer.innerHTML = '';

      // Smart status fallback: if filtered search for a specific GUID returns nothing, retry without filters
      if (workflows.length === 0 && page === 0 && (dbStatus || effectiveRetried) && isGuid) {
        const fallbackRes = await fetch(`${engineUrl}/dashboard/query?limit=${QUERY_PAGE}&search=${encodeURIComponent(searchTerm)}`);
        const fallbackBody = await fallbackRes.json();
        /** @type {Workflow[]} */
        const fallback = fallbackBody.workflows;
        if (fallback.length > 0) {
          const actualStatus = fallback.length === 1 ? fallback[0].status?.toLowerCase() : '';
          const targetChip = actualStatus === 'completed' ? 'completed'
                           : actualStatus === 'failed' ? 'failed'
                           : '';
          state.sectionStatus.query = targetChip;
          const bar = document.querySelector('.section-chips[data-section="query"]');
          if (bar) {
            for (const c of bar.querySelectorAll('.chip')) {
              const match = (/** @type {HTMLElement} */ (c).dataset.status || '') === targetChip;
              c.classList.toggle('active', match);
              if (match) {
                c.classList.remove('chip-flash');
                void /** @type {HTMLElement} */ (c).offsetWidth;
                c.classList.add('chip-flash');
                setTimeout(() => c.classList.remove('chip-flash'), 1500);
              }
            }
          }
          syncUrl();
          workflows = fallback;
          totalCount = /** @type {number} */ (fallbackBody.totalCount);
        }
      }

      queryPage = page;

      if (workflows.length === 0) {
        dom.queryEmpty.textContent = 'No workflows found';
        dom.queryEmpty.style.display = 'block';
        updatePager(0, 0);
      } else {
        dom.queryEmpty.style.display = 'none';
        for (const wf of workflows) {
          const card = document.createElement('div');
          const forceExpand = state.pendingExpand.delete(wf.idempotencyKey);
          const compact = state.compactSections.query && !forceExpand;
          card.className = `workflow-card${compact ? ' compact' : ''}`;
          card.style.animation = 'none';
          card.innerHTML = compact ? buildCompactCardHTML(wf, true) : buildCardHTML(wf, true);
          setCardFilterData(card, wf);
          dom.queryContainer.appendChild(card);
        }
        // Store cursor for next page
        if (workflows.length >= QUERY_PAGE) {
          queryPageCursors[page + 1] = workflows[workflows.length - 1].updatedAt ?? null;
        }
        updatePager(workflows.length, totalCount);
        applyFilter();
      }
    } catch (err) {
      dom.queryEmpty.textContent = `Error loading query: ${/** @type {Error} */ (err).message}`;
      dom.queryEmpty.style.display = 'block';
      updatePager(0, 0);
    } finally {
      const elapsed = Date.now() - spinStart;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => { btn.disabled = false; btn.classList.remove('spinning'); }, remaining);
    }
  };

  window.loadQuery = () => { queryPage = 0; queryPageCursors = [null]; return fetchQuery({ page: 0 }); };
  window.queryPrev = () => { if (queryPage > 0) fetchQuery({ page: queryPage - 1 }); };
  window.queryNext = () => fetchQuery({ page: queryPage + 1 });

  /* ============================================================
   *  16. STEP DETAIL MODAL
   * ============================================================ */

  /**
   * @param {string} wfKey
   * @param {string} stepKey
   * @param {string} stepName
   * @param {string} [createdAt]
   */
  /** Format an ISO duration / TimeSpan string to a human-friendly label */
  const fmtDuration = (/** @type {string|null|undefined} */ v) => {
    if (!v) return null;
    // .NET TimeSpan JSON: "HH:MM:SS" or "D.HH:MM:SS" or ISO 8601 "PT..."
    const iso = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(v);
    if (iso) {
      const h = parseInt(iso[1] || '0'), m = parseInt(iso[2] || '0'), s = parseFloat(iso[3] || '0');
      const parts = [];
      if (h) parts.push(`${h}h`);
      if (m) parts.push(`${m}m`);
      if (s) parts.push(`${s}s`);
      return parts.join(' ') || '0s';
    }
    // .NET "d.hh:mm:ss" or "hh:mm:ss" or "hh:mm:ss.fffffff"
    const dotnet = /^(?:(\d+)\.)?(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(v);
    if (dotnet) {
      const d = parseInt(dotnet[1] || '0'), h = parseInt(dotnet[2]), m = parseInt(dotnet[3]), s = parseInt(dotnet[4]);
      const parts = [];
      if (d) parts.push(`${d}d`);
      if (h) parts.push(`${h}h`);
      if (m) parts.push(`${m}m`);
      if (s) parts.push(`${s}s`);
      return parts.join(' ') || '0s';
    }
    return v;
  };

  /** Format an ISO timestamp to a locale-friendly string */
  const fmtTime = (/** @type {string|null|undefined} */ v) => {
    if (!v) return null;
    try {
      const d = new Date(v);
      return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
    } catch { return v; }
  };

  /** Format a relative time ago string */
  const fmtAgo = (/** @type {string|null|undefined} */ v) => {
    if (!v) return '';
    const ms = Date.now() - new Date(v).getTime();
    if (ms < 0) return '';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m ago`;
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h ago`;
  };

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
      return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${esc(abs || '')}${suffix}</span></div>`;
    };

    const status = /** @type {string} */ (data.status) || '';
    const isFailing = status === 'Failed' || status === 'Requeued';

    // --- Error banner + Loki link ---
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

    // --- Status + key ---
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

    // --- Retry ---
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

    // --- Command ---
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
      // Payload as JSON
      const payload = cmd.payload;
      if (payload != null) {
        html += '<div class="detail-section-sub">Payload</div>';
        html += `<pre>${syntaxHighlight(expandJsonStrings(payload))}</pre>`;
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
    if (e.key === 'Escape') closeModal();
  });

  /* ============================================================
   *  17. JSON UTILITIES  (expand embedded JSON strings + syntax highlighting)
   * ============================================================ */

  /**
   * @param {unknown} obj
   * @returns {unknown}
   */
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

  /**
   * @param {unknown} obj
   * @returns {string}
   */
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
   *  18. GENERIC HELPERS
   * ============================================================ */

  /** @param {string} s */
  const cssId = (s) => s.replace(/[^a-zA-Z0-9-_]/g, '_');

  /** @param {string} s */
  const esc = (s) => {
    if (!s) return '';
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  };

  /** @param {string} s */
  const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ============================================================
   *  INIT — fetch engine URL from config, then connect SSE
   * ============================================================ */

  /* ============================================================
   *  HOT-RELOAD  (SSE from dashboard server on file change)
   * ============================================================ */

  let hotReloadConnectedOnce = false;
  let hotReloadDisabled = false;

  const watchForChanges = () => {
    if (hotReloadDisabled) return;
    const es = new EventSource('/api/hot-reload');
    es.onopen = () => {
      if (hotReloadConnectedOnce) {
        es.close();
        location.reload();
        return;
      }
      hotReloadConnectedOnce = true;
    };
    es.onmessage = () => location.reload();
    es.onerror = () => {
      es.close();
      if (!hotReloadConnectedOnce) {
        // Endpoint doesn't exist (production) — stop trying
        hotReloadDisabled = true;
        return;
      }
      setTimeout(watchForChanges, 2000);
    };
  };

  /* ============================================================
   *  THEME TOGGLE
   * ============================================================ */

  const MOON_SVG = '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8A9.06 9.06 0 0 0 12 3z"/>';
  const SUN_SVG = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

  const getTheme = () => document.documentElement.getAttribute('data-theme') || '';

  const updateThemeToggle = (/** @type {string} */ theme) => {
    if (!dom.themeIcon || !dom.themeLabel) return;
    if (theme === 'altinn') {
      dom.themeIcon.innerHTML = SUN_SVG;
      dom.themeIcon.setAttribute('fill', 'none');
      dom.themeIcon.setAttribute('stroke', 'currentColor');
      dom.themeIcon.setAttribute('stroke-width', '2');
      dom.themeIcon.setAttribute('stroke-linecap', 'round');
      dom.themeIcon.setAttribute('stroke-linejoin', 'round');
      dom.themeLabel.textContent = 'Dark';
    } else {
      dom.themeIcon.innerHTML = MOON_SVG;
      dom.themeIcon.setAttribute('fill', 'currentColor');
      dom.themeIcon.removeAttribute('stroke');
      dom.themeIcon.removeAttribute('stroke-width');
      dom.themeIcon.removeAttribute('stroke-linecap');
      dom.themeIcon.removeAttribute('stroke-linejoin');
      dom.themeLabel.textContent = 'Altinn';
    }
  };

  const setTheme = (/** @type {string} */ theme) => {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
    try { if (theme) localStorage.setItem('theme', theme); else localStorage.removeItem('theme'); } catch { /* ignore */ }
    updateThemeToggle(theme);
  };

  /** @type {() => void} */
  const toggleTheme = () => { setTheme(getTheme() === 'altinn' ? '' : 'altinn'); syncUrl(); };
  // @ts-ignore — exposed for inline onclick
  window.toggleTheme = toggleTheme;

  // Apply stored theme on script load (flash-prevention script already set the attribute, but update the button)
  updateThemeToggle(getTheme());

  /* ============================================================
   *  URL SYNC — persist tab + filters to query params
   * ============================================================ */

  const syncUrl = () => {
    const p = new URLSearchParams();
    const theme = getTheme();
    if (theme) p.set('theme', theme);
    const tab = document.querySelector('.tab.active')?.getAttribute('data-tab');
    if (tab && tab !== 'live') p.set('tab', tab);
    if (state.querySearch) p.set('q', state.querySearch);
    if (state.sectionStatus.scheduled) p.set('ss', state.sectionStatus.scheduled);
    if (state.sectionStatus.live) p.set('ls', state.sectionStatus.live);
    if (state.sectionStatus.recent) p.set('rs', state.sectionStatus.recent);
    if (state.sectionStatus.query) p.set('qs', state.sectionStatus.query);
    if (customTimeRange) { p.set('qtf', customTimeRange.from); p.set('qtt', customTimeRange.to); }
    else if (queryTimeRange) p.set('qt', String(queryTimeRange));
    if (/** @type {HTMLInputElement} */ (document.getElementById('retried-check'))?.checked) p.set('qr', '1');
    if (state.orgFilter.size) p.set('org', [...state.orgFilter].join(','));
    if (state.appFilter.size) p.set('app', [...state.appFilter].join(','));
    if (state.partyFilter.size) p.set('party', [...state.partyFilter].join(','));
    if (state.guidFilter.size) p.set('guid', [...state.guidFilter].join(','));
    const collapsed = [];
    const expanded = [];
    for (const [id, key] of [['scheduled-section','sched'],['live-section','inbox'],['recent-section','recent']]) {
      const el = document.getElementById(id);
      if (!el) continue;
      // scheduled defaults collapsed, others default expanded
      if (id === 'scheduled-section') { if (!el.classList.contains('collapsed')) expanded.push(key); }
      else { if (el.classList.contains('collapsed')) collapsed.push(key); }
    }
    if (collapsed.length) p.set('c', collapsed.join(','));
    if (expanded.length) p.set('e', expanded.join(','));
    // Compact sections
    const cpt = Object.entries(state.compactSections).filter(([, v]) => v).map(([k]) => k);
    if (cpt.length) p.set('cpt', cpt.join(','));
    // Individually expanded cards within compact sections (base64 to keep URL tidy)
    const expKeys = /** @type {string[]} */ ([]);
    for (const [section, container] of [['inbox', dom.liveContainer], ['recent', dom.recentContainer]]) {
      if (!state.compactSections[section]) continue;
      for (const el of container.querySelectorAll('.workflow-card:not(.compact)')) {
        const k = /** @type {HTMLElement} */ (el).dataset.wfkey;
        if (k) expKeys.push(k);
      }
    }
    if (expKeys.length) { try { p.set('exp', btoa(expKeys.join(','))); } catch { /* ignore */ } }
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  };

  const restoreUrl = () => {
    const p = new URLSearchParams(location.search);
    const isShared = p.toString().length > 0;

    // If URL has ANY params, treat as a shared snapshot:
    // reset everything to defaults so colleague sees exactly what was shared.
    if (isShared) {
      // Defaults: scheduled collapsed, inbox+recent expanded
      document.getElementById('scheduled-section')?.classList.add('collapsed');
      document.getElementById('live-section')?.classList.remove('collapsed');
      document.getElementById('recent-section')?.classList.remove('collapsed');
      // Defaults: compact off except query (query defaults compact)
      for (const s of Object.keys(state.compactSections)) state.compactSections[s] = s === 'query';
      // Defaults: all status filters = All, no time range, no retried
      state.sectionStatus = { live: '', recent: '', query: '' };
      queryTimeRange = 0;
      customTimeRange = null;
      const rc = /** @type {HTMLInputElement | null} */ (document.getElementById('retried-check'));
      if (rc) rc.checked = false;
      for (const bar of document.querySelectorAll('.section-chips')) {
        const isToggle = bar.classList.contains('query-toggle');
        for (const c of bar.querySelectorAll('.chip')) {
          if (isToggle) c.classList.add('active'); // toggle chips: all on by default
          else c.classList.toggle('active', (/** @type {HTMLElement} */ (c).dataset.status || '') === '');
        }
      }
    }

    // Theme: URL param takes priority over localStorage (for shared links)
    const urlTheme = p.get('theme');
    if (urlTheme) setTheme(urlTheme);
    else if (!isShared) { const stored = getTheme(); updateThemeToggle(stored); }

    const q = p.get('q');
    if (q) { state.querySearch = q; dom.querySearchInput.value = q; }
    for (const [key, section] of [['ss', 'scheduled'], ['ls', 'live'], ['rs', 'recent'], ['qs', 'query']]) {
      const v = p.get(key);
      if (v) {
        state.sectionStatus[section] = v;
        const bar = document.querySelector(`.section-chips[data-section="${section}"]`);
        if (bar) {
          const isToggle = bar.classList.contains('query-toggle');
          if (isToggle) {
            // Toggle chips: activate only the matching one, deactivate the rest
            for (const c of bar.querySelectorAll('.chip')) c.classList.toggle('active', (c.dataset.status || '') === v);
          } else {
            // Radio chips: activate matching one
            for (const c of bar.querySelectorAll('.chip')) c.classList.toggle('active', (c.dataset.status || '') === v);
          }
        }
      }
    }
    // Query time range
    const qtf = p.get('qtf');
    const qtt = p.get('qtt');
    if (qtf && qtt) {
      customTimeRange = { from: qtf, to: qtt };
      updateTimeLabel();
    } else {
      const qt = parseInt(p.get('qt') || '0', 10);
      if (qt > 0) {
        queryTimeRange = qt;
        updateTimeLabel();
        const dropdown = document.getElementById('time-dropdown');
        if (dropdown) for (const o of dropdown.querySelectorAll('.time-option')) o.classList.toggle('active', (/** @type {HTMLElement} */ (o).dataset.minutes || '') === String(qt));
      }
    }
    // Query retried toggle
    if (p.get('qr') === '1') {
      const check = /** @type {HTMLInputElement | null} */ (document.getElementById('retried-check'));
      if (check) check.checked = true;
    }
    for (const v of (p.get('org') || '').split(',').filter(Boolean)) state.orgFilter.add(v);
    for (const v of (p.get('app') || '').split(',').filter(Boolean)) state.appFilter.add(v);
    for (const v of (p.get('party') || '').split(',').filter(Boolean)) state.partyFilter.add(v);
    for (const v of (p.get('guid') || '').split(',').filter(Boolean)) state.guidFilter.add(v);
    if (state.orgFilter.size || state.appFilter.size) {
      // Dropdowns will be fully rebuilt when orgs+apps arrive; just update toggle badges for now
      updateDropdownToggle('org');
      updateDropdownToggle('app');
      // Disable app dropdown until org is selected
      dom.appDropdown.classList.toggle('disabled', state.orgFilter.size === 0);
    }
    if (state.partyFilter.size || state.guidFilter.size) {
      rebuildSelectedOnlyChips(dom.partyChips, state.partyFilter, 'party-chip');
      rebuildSelectedOnlyChips(dom.guidChips, state.guidFilter, 'guid-chip', v => v.substring(0, 8));
      updatePartyGuidLabels();
    }
    if (state.orgFilter.size || state.appFilter.size || state.partyFilter.size || state.guidFilter.size) {
      applyFilter();
    }
    // Compact sections
    for (const s of (p.get('cpt') || '').split(',').filter(Boolean)) {
      if (s in state.compactSections) state.compactSections[s] = true;
    }
    // Expanded cards (queued until cards appear via SSE)
    const expParam = p.get('exp');
    if (expParam) {
      try { for (const k of atob(expParam).split(',').filter(Boolean)) state.pendingExpand.add(k); } catch { /* ignore */ }
    }
    // Section collapse overrides
    const keyMap = { sched: 'scheduled-section', inbox: 'live-section', recent: 'recent-section' };
    const coll = (p.get('c') || '').split(',').filter(Boolean);
    const exp = (p.get('e') || '').split(',').filter(Boolean);
    for (const k of coll) { const el = document.getElementById(keyMap[k] || ''); if (el) el.classList.add('collapsed'); }
    for (const k of exp) { const el = document.getElementById(keyMap[k] || ''); if (el) el.classList.remove('collapsed'); }
    // Switch tab last — switchTab triggers loadQuery + syncUrl, so all state must be restored first
    const tab = p.get('tab');
    if (tab) switchTab(tab);
  };

  /* ============================================================
   *  INIT — fetch engine URL from config, then connect SSE
   * ============================================================ */

  const init = async () => {
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      engineUrl = config.engineUrl || '';
    } catch {
      console.warn('Failed to load config, using same-origin for engine URL');
    }

    restoreUrl();
    connectSSE(`${engineUrl}/dashboard/stream`, updateDashboard, { showStatus: true });
    connectSSE(`${engineUrl}/dashboard/stream/recent`, (data) => updateRecentWorkflows(/** @type {Workflow[]} */ (data)));
    requestAnimationFrame(updateTimers);
    watchForChanges();
  };

  init();

})();

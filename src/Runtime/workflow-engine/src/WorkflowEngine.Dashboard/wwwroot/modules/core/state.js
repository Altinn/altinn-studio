/* Type definitions, DOM references, shared state */

/**
 * @typedef {'Enqueued' | 'Processing' | 'Completed' | 'Failed' | 'Requeued' | 'Canceled'} StepStatus
 * @typedef {'app' | 'webhook' | 'Noop' | 'Throw' | 'Timeout' | 'Delegate'} CommandType
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
 *   stateChanged:   boolean,
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
 *   hasState:       boolean,
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

/* ── DOM references ──────────────────────────────────────── */

export const dom = {
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
  modalTabs:        /** @type {HTMLElement} */ (document.getElementById('modal-tabs')),
  modalSubtabs:     /** @type {HTMLElement} */ (document.getElementById('modal-subtabs')),
  modalBody:        /** @type {HTMLElement} */ (document.getElementById('modal-body')),
  stateModal:       /** @type {HTMLElement} */ (document.getElementById('state-modal')),
  stateTitle:       /** @type {HTMLElement} */ (document.getElementById('state-title')),
  stateBody:        /** @type {HTMLElement} */ (document.getElementById('state-body')),
  themeToggle:      /** @type {HTMLElement} */ (document.getElementById('theme-toggle')),
  themeIcon:        /** @type {HTMLElement} */ (document.getElementById('theme-icon')),
  themeLabel:       /** @type {HTMLElement} */ (document.getElementById('theme-label')),
};

/* ── State ───────────────────────────────────────────────── */

/** Engine API base URL (resolved from /api/config) */
export let engineUrl = '';

/** @param {string} url */
export const setEngineUrl = (url) => { engineUrl = url; };

/** @type {DashboardState} */
export const state = {
  previousWorkflows:    {},
  workflowFingerprints: {},
  workflowTimers:       {},
  lastRecentKeys:       '',
  queryLoaded:        false,
  liveFilter:           '',
  querySearch:          '',
  sectionStatus:        { scheduled: '', live: '', recent: '', query: 'failed' },
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
export const workflowData = {};

/* ── BPMN transition parsing & step phase mapping ────────── */

/** Parse BPMN transition from a "next" workflow's idempotencyKey.
 *  @param {Workflow} wf
 *  @returns {{ from: string, to: string } | null} */
export const parseTransition = (wf) => {
  if (wf.operationId !== 'next') return null;
  const m = wf.idempotencyKey.match(/\/next\/from-(.*?)-to-(.*)$/);
  return m ? { from: m[1], to: m[2] || 'End Event' } : null;
};

const TASK_END_COMMANDS = new Set([
  'EndTask','CommonTaskFinalization','EndTaskLegacyHook',
  'OnTaskEndingHook','LockTaskData',
  'AbandonTask','OnTaskAbandonHook','AbandonTaskLegacyHook',
]);
const TASK_START_COMMANDS = new Set([
  'UnlockTaskData','StartTask','StartTaskLegacyHook',
  'OnTaskStartingHook','CommonTaskInitialization',
]);
const PROCESS_END_COMMANDS = new Set([
  'OnProcessEndingHook',
]);

/** @param {string} commandDetail @returns {'end'|'start'|'process-end'|null} */
export const stepPhase = (commandDetail) => {
  if (TASK_END_COMMANDS.has(commandDetail)) return 'end';
  if (TASK_START_COMMANDS.has(commandDetail)) return 'start';
  if (PROCESS_END_COMMANDS.has(commandDetail)) return 'process-end';
  return null;
};

/** Extra sub-label for a step (e.g. service task type). Returns null if none. */
export const stepSubLabel = (step) => {
  if (step.commandDetail === 'ExecuteServiceTask' && step.commandPayload) {
    try {
      const p = JSON.parse(step.commandPayload);
      if (p.serviceTaskType) return p.serviceTaskType;
    } catch { /* ignore */ }
  }
  return null;
};

/* Type definitions, DOM references, shared state */

/**
 * @typedef {'Enqueued' | 'Processing' | 'Completed' | 'Failed' | 'Requeued' | 'Waiting' | 'Canceled'} StepStatus
 * @typedef {'app' | 'webhook' | 'Noop' | 'Throw' | 'Timeout' | 'Delegate'} CommandType
 */

/**
 * @typedef {{
 *   idempotencyKey: string,
 *   operationId:    string,
 *   commandType:    CommandType,
 *   commandDetail:  string,
 *   status:         StepStatus,
 *   processingOrder: number,
 *   retryCount:     number,
 *   deferCount:     number,
 *   firstDeferredAt: string | null,
 *   lastDeferReason: string | null,
 *   backoffUntil:   string | null,
 *   createdAt:      string,
 *   executionStartedAt: string | null,
 *   updatedAt:      string | null,
 *   stateChanged:   boolean,
 *   labels?:        Record<string, string>,
 * }} Step
 */

/**
 * A related workflow (dependency, dependent, or link) as carried on a card.
 * @typedef {{
 *   databaseId:  string,
 *   operationId: string,
 *   status:      string,
 * }} WorkflowRelation
 */

/**
 * Relation arrays are tri-state: `undefined` = not loaded by the source query (fetch on demand
 * via /dashboard/relations), `[]` = loaded and none exist. `isHead === false` marks workflows
 * deliberately invisible to collection head tracking (side chains).
 * @typedef {{
 *   databaseId:     string,
 *   idempotencyKey: string,
 *   operationId:    string,
 *   status:         string,
 *   traceId:        string | null,
 *   namespace:      string,
 *   collectionKey:  string | null,
 *   mailboxId:      string | undefined,
 *   labels:         Record<string, string> | null,
 *   backoffUntil:   string | null,
 *   createdAt:      string,
 *   updatedAt:      string | null,
 *   executionStartedAt: string | null,
 *   removedAt:      string | null,
 *   startAt:        string | null,
 *   hasState:       boolean,
 *   isHead:         boolean | undefined,
 *   dependsOn:      WorkflowRelation[] | undefined,
 *   dependents:     WorkflowRelation[] | undefined,
 *   links:          WorkflowRelation[] | undefined,
 *   steps:          Step[],
 * }} Workflow
 */

/**
 * One position of a mailbox's log. `parkedForSeconds` is absent while a receiver is still parked
 * (count up from `heldAt`) and for one that never parked.
 * @typedef {{
 *   position:           number,
 *   state:              'delivered' | 'paired' | 'waiting' | 'closed',
 *   deliveryKey:        string | undefined,
 *   acceptedAt:         string | undefined,
 *   receiverWorkflowId: string | undefined,
 *   heldAt:             string | undefined,
 *   releasedAt:         string | undefined,
 *   claimedAt:          string | undefined,
 *   parkedForSeconds:   number | undefined,
 * }} MailboxPosition
 */

/**
 * A mailbox as `/dashboard/mailboxes` reports it; `positions` is empty for a freshly minted one.
 * @typedef {{
 *   id:                   string,
 *   namespace:            string,
 *   idempotencyKey:       string,
 *   collectionKey:        string | undefined,
 *   status:               'Open' | 'Disposed',
 *   disposedReason:       'Request' | 'Deadline' | undefined,
 *   deadline:             string,
 *   createdAt:            string,
 *   disposedAt:           string | undefined,
 *   nextIdx:              number,
 *   nextSeq:              number,
 *   unpairedDeliveries: number,
 *   positions:            MailboxPosition[],
 * }} Mailbox
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
 *   capacity:       { workers: SlotStatus, db: SlotStatus, http: SlotStatus },
 *   scheduledCount: number,
 * }} DashboardPayload
 */

/**
 * `previousWorkflows` is the live section's own set: the freshest SSE copy of every workflow it
 * holds a live card for, dropped the moment one leaves (an exiting card outlives its entry by the
 * length of its animation). Other sections read it for fresher data than their own snapshot, and
 * to tell a live workflow from a settled one.
 *
 * @typedef {{
 *   previousWorkflows:    Record<string, Workflow>,
 *   workflowFingerprints: Record<string, string>,
 *   lastRecentKeys:       string,
 *   queryLoaded:        boolean,
 *   liveFilter:           string,
 *   querySearch:          string,
 *   sectionStatus:        Record<string, string>,
 *   labelFilters:         Map<string, Set<string>>,
 *   namespaceFilter:      Set<string>,
 *   allNamespaces:        Set<string>,
 * }} DashboardState
 */

/* ── DOM references ──────────────────────────────────────── */

export const dom = {
    liveContainer: /** @type {HTMLElement} */ (document.getElementById('live-workflows')),
    liveEmpty: /** @type {HTMLElement} */ (document.getElementById('live-empty')),
    recentContainer: /** @type {HTMLElement} */ (document.getElementById('recent-workflows')),
    recentEmpty: /** @type {HTMLElement} */ (document.getElementById('recent-empty')),
    recentSection: /** @type {HTMLElement} */ (document.getElementById('recent-section')),
    queryContainer: /** @type {HTMLElement} */ (document.getElementById('query-workflows')),
    queryEmpty: /** @type {HTMLElement} */ (document.getElementById('query-empty')),
    liveFilterInput: /** @type {HTMLInputElement} */ (document.getElementById('live-filter-input')),
    liveFilterClear: /** @type {HTMLElement} */ (document.getElementById('live-filter-clear')),
    querySearchInput: /** @type {HTMLInputElement} */ (
        document.getElementById('query-search-input')
    ),
    labelFilterBar: /** @type {HTMLElement} */ (document.getElementById('label-filter-bar')),
    scheduledSection: /** @type {HTMLElement} */ (document.getElementById('scheduled-section')),
    scheduledContainer: /** @type {HTMLElement} */ (document.getElementById('scheduled-workflows')),
    nsDropdown: /** @type {HTMLElement} */ (document.getElementById('ns-dropdown')),
    nsList: /** @type {HTMLElement} */ (document.getElementById('ns-list')),
    nsSelected: /** @type {HTMLElement} */ (document.getElementById('ns-selected')),
    sseDot: /** @type {HTMLElement} */ (document.getElementById('sse-dot')),
    engineIcon: /** @type {HTMLElement} */ (document.getElementById('engine-icon')),
    engineStatusLabel: /** @type {HTMLElement} */ (document.getElementById('engine-status-label')),
    modal: /** @type {HTMLElement} */ (document.getElementById('step-modal')),
    modalTitle: /** @type {HTMLElement} */ (document.getElementById('modal-title')),
    modalTabs: /** @type {HTMLElement} */ (document.getElementById('modal-tabs')),
    modalSubtabs: /** @type {HTMLElement} */ (document.getElementById('modal-subtabs')),
    modalBody: /** @type {HTMLElement} */ (document.getElementById('modal-body')),
    stateModal: /** @type {HTMLElement} */ (document.getElementById('state-modal')),
    stateTitle: /** @type {HTMLElement} */ (document.getElementById('state-title')),
    stateBody: /** @type {HTMLElement} */ (document.getElementById('state-body')),
    chainModal: /** @type {HTMLElement} */ (document.getElementById('chain-modal')),
    chainTitle: /** @type {HTMLElement} */ (document.getElementById('chain-title')),
    chainBody: /** @type {HTMLElement} */ (document.getElementById('chain-body')),
    themeToggle: /** @type {HTMLElement} */ (document.getElementById('theme-toggle')),
    themeIcon: /** @type {HTMLElement} */ (document.getElementById('theme-icon')),
    themeLabel: /** @type {HTMLElement} */ (document.getElementById('theme-label')),
};

/* ── State ───────────────────────────────────────────────── */

/** @type {DashboardState} */
export const state = {
    previousWorkflows: {},
    workflowFingerprints: {},
    lastRecentKeys: '',
    queryLoaded: false,
    liveFilter: '',
    querySearch: '',
    sectionStatus: { scheduled: '', live: '', recent: '', query: 'failed' },
    /** @type {Map<string, Set<string>>} label key → selected values */
    labelFilters: new Map(),
    /** @type {Map<string, string[]>} label key → all known values (from backend) */
    labelValues: new Map(),
    labelValuesLoaded: false,
    /** @type {Set<string>} selected namespace values */
    namespaceFilter: new Set(),
    /** @type {Set<string>} all known namespaces from backend */
    allNamespaces: new Set(),
    compactSections: {
        scheduled: localStorage.getItem('compact:scheduled') === '1',
        inbox: localStorage.getItem('compact:inbox') === '1',
        recent: localStorage.getItem('compact:recent') === '1',
        query: localStorage.getItem('compact:query') !== '0',
    },
    /** @type {'chains' | 'compact' | 'full'} Recent section view mode */
    recentView: /** @type {'chains' | 'compact' | 'full'} */ (
        (() => {
            const v = localStorage.getItem('recentView');
            if (v === 'chains' || v === 'compact' || v === 'full') return v;
            // Migrate the legacy two-way toggle; new default is the grouped chains view.
            return localStorage.getItem('compact:recent') === '1' ? 'compact' : 'chains';
        })()
    ),
    /** @type {'chains' | 'compact' | 'full'} Query tab view mode (compact default: results are often unrelated single rows) */
    queryView: /** @type {'chains' | 'compact' | 'full'} */ (
        (() => {
            const v = localStorage.getItem('queryView');
            if (v === 'chains' || v === 'compact' || v === 'full') return v;
            return localStorage.getItem('compact:query') !== '0' ? 'compact' : 'full';
        })()
    ),
    /** @type {Workflow[]} */ recentWorkflows: [],
    /** @type {Set<string>} */ pendingExpand: new Set(),
};

// The flat-mode card builders and URL sync still key off the booleans; keep them derived.
state.compactSections.recent = state.recentView === 'compact';
state.compactSections.query = state.queryView === 'compact';

/** @type {Record<string, Workflow>} */
export const workflowData = {};

/* ── BPMN transition parsing & step phase mapping ────────── */

/** Parse BPMN transition from the workflow's operationId (e.g. "Process next: Form -> Verify").
 *  @param {Workflow} wf
 *  @returns {{ from: string, to: string } | null} */
export const parseTransition = (wf) => {
    const colon = wf.operationId.indexOf(':');
    if (colon < 0) return null;
    const rest = wf.operationId.slice(colon + 1);
    let arrow = rest.indexOf('\u2192');
    let len = 1;
    if (arrow < 0) {
        arrow = rest.indexOf('->');
        len = 2;
    }
    if (arrow < 0) return null;
    return {
        from: rest.slice(0, arrow).trim() || 'Start Event',
        to: rest.slice(arrow + len).trim() || 'End Event',
    };
};

/**
 * Step label naming the BPMN element whose lifecycle the step runs — the task being left, the task
 * being entered, or the end event. Written by the Altinn app library on the pre-commit lifecycle
 * steps only, which is exactly the run that belongs under one element name.
 */
const PROCESS_ELEMENT_LABEL = 'processNextElement';

/* The command-name map below is the fallback for steps that carry no element label: workflows
 * enqueued before the label existed, and apps still on an older Altinn.App version — the engine
 * serves many apps at once, so this is a standing fallback rather than a migration window. It
 * cannot name the element itself, only which end of the transition the step sits at, which the
 * renderer then resolves against the operationId. A command missing from it has no group, so it
 * falls outside the brackets. */
const TASK_END_COMMANDS = new Set([
    'EndTask',
    'CommonTaskFinalization',
    'OnTaskEndingHook',
    'LockTaskData',
    'AbandonTask',
    'OnTaskAbandonHook',
]);
const TASK_START_COMMANDS = new Set([
    'UnlockTaskData',
    'CleanupGeneratedFromTask',
    'StartTask',
    'OnTaskStartingHook',
    'CommonTaskInitialization',
]);
const PROCESS_END_COMMANDS = new Set(['OnProcessEndingHook', 'EndProcessLegacyHook']);

/** @param {string} commandDetail @returns {'end'|'start'|'process-end'|null} */
export const stepPhase = (commandDetail) => {
    if (TASK_END_COMMANDS.has(commandDetail)) return 'end';
    if (TASK_START_COMMANDS.has(commandDetail)) return 'start';
    if (PROCESS_END_COMMANDS.has(commandDetail)) return 'process-end';
    return null;
};

/**
 * The bracket group a step belongs to: a `key` to group consecutive steps by, and the `label` drawn
 * over the group. Null for a step that belongs to no element, which ends the group before it.
 *
 * The step's own element label wins, because it is the app's own answer and names the element
 * outright. Only without one does this fall back to {@link stepPhase} plus the transition parsed
 * from the operationId — a guess that is right whenever the command is one this dashboard version
 * happens to know.
 *
 * Keys from the two sources are deliberately distinct strings, so a labeled and an unlabeled step
 * never merge into one bracket on the strength of a coincidence.
 *
 * @param {Step} step
 * @param {{ from: string, to: string }} tx
 * @returns {{ key: string, label: string } | null}
 */
export const stepGroup = (step, tx) => {
    const element = step.labels?.[PROCESS_ELEMENT_LABEL];
    if (element) return { key: `element:${element}`, label: element };

    const phase = stepPhase(step.commandDetail);
    if (phase === 'end') return { key: 'phase:end', label: tx.from };
    if (phase === 'start') return { key: 'phase:start', label: tx.to };
    if (phase === 'process-end') return { key: 'phase:process-end', label: 'End Event' };
    return null;
};

/**
 * Extra sub-label for a step. A Waiting step shows the reason its command gave for deferring, so
 * the card says what the step is waiting for without opening the modal.
 * @param {Step} step
 * @returns {string | null}
 */
export const stepSubLabel = (step) =>
    step.status === 'Waiting' && step.lastDeferReason ? step.lastDeferReason : null;

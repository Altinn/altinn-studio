/* Card rendering — shared by live, recent, and query views */

import { stepSubLabel, state, workflowData, parseTransition } from '../core/state.js';
import {
    esc,
    escAttr,
    escJsArg,
    formatElapsed,
    fmtTime,
    fmtNamespace,
    abbrevGuids,
    isAuxiliaryWorkflow,
    buildTraceUrl,
} from '../core/helpers.js';
import {
    buildPipelineHTML,
    scrollPipelineToActive,
    setCardHTMLKeepingPipelineScroll,
} from './pipeline.js';

/** @param {string} text @param {string} [title] */
export const copyIconHTML = (text, title) =>
    `<a class="open-btn" onclick="copyText(event,'${escJsArg(text)}')" title="${escAttr(title || 'Copy')}">\u29C9</a>`;

/** Waterfall icon (staggered bars) for the trace link; neutral, as the host picks the trace viewer. */
const TRACE_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 4h10v3H3zm4 6.5h12v3H7zM11 17h10v3H11z"/></svg>';

/** @param {string} traceId @param {string} [title] @param {string} [extraClass] @returns {string} */
export const traceLink = (traceId, title, extraClass) => {
    const url = buildTraceUrl(traceId);
    if (!url) return '';
    return `<a class="open-btn trace-btn${extraClass ? ' ' + extraClass : ''}" href="${escAttr(url)}" target="_blank" onclick="event.stopPropagation()" title="${title || 'View trace'}">${TRACE_ICON}</a>`;
};

/** @param {string} traceId @returns {string} */
export const traceIconHTML = (traceId) => traceLink(traceId, 'Engine trace');

/** @param {import('../core/state.js').Workflow} wf @returns {string} */
export const stateIconHTML = (wf) =>
    `<a class="open-btn state-btn" onclick="openStateModal('${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}')" title="View state trail">&#123;&#125;</a>`;

/** Tree icon for the chain modal (dependency-ordered view of the connected graph). */
const CHAIN_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3zM7 9H4V5h3zm10 6h3v4h-3zm0-10h3v4h-3z"/></svg>';

/** @param {import('../core/state.js').Workflow} wf @returns {string} */
export const chainIconHTML = (wf) =>
    `<a class="open-btn chain-btn" onclick="openChainModal(event,'${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}')" title="View workflow chain">${CHAIN_ICON}</a>`;

/** @param {Event} e @param {string} text */
window.copyText = async (e, text) => {
    e.stopPropagation();
    try {
        await navigator.clipboard.writeText(text);
        const btn = /** @type {HTMLElement} */ (e.currentTarget);
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1200);
    } catch {
        /* ignore */
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
        html += `<span class="timestamp" data-iso="${escAttr(wf.createdAt)}">${esc(startTs)}</span>`;
    }
    const endIso = wf.removedAt || wf.steps.at(-1)?.updatedAt;
    if (endIso && (isStatic || wf.removedAt)) {
        const endTs = fmtTime(endIso);
        if (endTs) {
            html += `<span class="ts-arrow">\u2192</span>`;
            html += `<span class="timestamp" data-iso="${escAttr(endIso)}">${esc(endTs)}</span>`;
        }
    } else if (startTs) {
        html += `<span class="ts-arrow ts-placeholder">\u2192</span>`;
        html += `<span class="timestamp ts-placeholder">&nbsp;</span>`;
    }
    if (!isStatic) {
        html += `<span class="elapsed" data-timer="${escAttr(wf.databaseId)}">0.0s</span>`;
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

/* ── Label segments (namespace + labels) ─────────────────── */

/**
 * Label keys whose information is surfaced elsewhere in the header (the task
 * transition shown as the workflow name, plus the instance chip), so they are
 * not dumped again as raw value segments.
 */
const HANDLED_LABEL_KEYS = new Set([
    'processNextSourceTask',
    'processNextSourceFlow',
    'processNextTargetTask',
    'processNextInstanceGuid',
]);

/**
 * Display name for a workflow: the parsed BPMN transition ("from → to") when the
 * operationId encodes one, otherwise the raw operationId. The full operationId is
 * preserved in the title for reference.
 * @param {import('../core/state.js').Workflow} wf
 * @returns {{ text: string, title: string }}
 */
const wfDisplayName = (wf) => {
    const tx = parseTransition(wf);
    return {
        text: tx ? `${tx.from} → ${tx.to}` : wf.operationId,
        title: wf.operationId,
    };
};

/** @param {import('../core/state.js').Workflow} wf @param {string} cls @returns {string} */
const nameSpanHTML = (wf, cls) => {
    const n = wfDisplayName(wf);
    return `<span class="${cls}" title="${escAttr(n.title)}">${esc(n.text)}</span>`;
};

/** Filter-funnel icon shown on the collection chip to signal it filters connected workflows. */
const COLLECTION_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>';

/**
 * Build clickable label segments for a workflow card header, ordered by debugging
 * value: namespace, the instance id, then the collection key (groups connected
 * workflows). Remaining labels render as readable `key=value` segments.
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} interactive - true adds onclick filter handlers
 * @returns {string}
 */
export const buildLabelsHTML = (wf, interactive) => {
    /**
     * @param {string} key @param {string} value @param {string} display @param {string} cls
     */
    const seg = (key, value, display, cls) =>
        interactive
            ? `<span class="${cls}" onclick="toggleLabelFilter('${escJsArg(key)}','${escJsArg(value)}')" title="Filter by ${escAttr(key)}=${escAttr(display)}">${esc(display)}</span>`
            : `<span class="${cls}" title="${escAttr(key)}">${esc(display)}</span>`;
    const sep = `<span class="seg-sep">/</span>`;

    let html = seg('namespace', wf.namespace, fmtNamespace(wf.namespace), 'seg key');
    const instance = wf.labels?.processNextInstanceGuid;
    if (instance) {
        // Abbreviated for display so headers don't wrap; tooltip, filter, and copy keep the full id.
        html +=
            sep +
            seg(
                'processNextInstanceGuid',
                instance,
                abbrevGuids(instance) ?? instance,
                'seg instance',
            );
        html += copyIconHTML(instance, 'Copy instance id');
    }
    if (wf.labels) {
        for (const [key, value] of Object.entries(wf.labels)) {
            if (HANDLED_LABEL_KEYS.has(key)) continue;
            html += sep + seg(key, value, `${key}=${value}`, 'seg');
        }
    }
    return html;
};

/**
 * Fallback copy affordance for the card action cluster. Workflows with an app
 * instance get an inline copy button next to the instance id, so here we only
 * offer the idempotency key as a handle for workflows that carry no instance.
 * @param {import('../core/state.js').Workflow} wf
 * @returns {string}
 */
const primaryCopyHTML = (wf) =>
    wf.labels?.processNextInstanceGuid
        ? ''
        : copyIconHTML(wf.idempotencyKey, 'Copy idempotency key');

/**
 * De-emphasized collection filter control for the card header's right cluster.
 * Renders a gray funnel chip that filters to the workflows sharing this
 * collection key (the full key is preserved in the title). Returns '' when the
 * workflow has no collection.
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} interactive - true adds the onclick filter handler
 * @returns {string}
 */
export const collectionButtonHTML = (wf, interactive) => {
    if (!wf.collectionKey) return '';
    if (!interactive) {
        return `<span class="seg collection" title="${escAttr(wf.collectionKey)}">collection</span>`;
    }
    const title = escAttr(`Filter by collection (${abbrevGuids(wf.collectionKey)})`);
    return `<span class="seg collection" onclick="toggleLabelFilter('collectionKey','${escJsArg(wf.collectionKey)}')" title="${title}">${COLLECTION_ICON}collection</span>`;
};

/* ── Relation chips (dependsOn / dependents / links) ──────── */

/** Chain-link icon for the links relation chip. */
const LINK_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';

/** The three relation groups shown as chips: property, glyph, tooltip label. */
const REL_GROUPS = /** @type {['dependsOn'|'dependents'|'links', string, string][]} */ ([
    ['dependsOn', '↑', 'Depends on'],
    ['dependents', '↓', 'Dependents'],
    ['links', LINK_ICON, 'Linked to'],
]);

/**
 * Build the relation chips for a card: one chip per non-empty relation group, with a
 * status-colored dot per related workflow. When relations were not loaded by the source query
 * (recent/query cards), renders a single ghost chip that fetches them on demand — full cards
 * only, so compact rows stay clean.
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} [showUnknown] - render the ghost load chip when relations are unknown
 * @returns {string}
 */
const buildRelationsHTML = (wf, showUnknown) => {
    if (wf.dependsOn === undefined && wf.dependents === undefined && wf.links === undefined) {
        return showUnknown
            ? `<span class="seg rel-chip rel-unknown" onclick="loadRelations(event,'${escJsArg(wf.databaseId)}')" title="Load related workflows (dependencies and links)">rel?</span>`
            : '';
    }
    let html = '';
    for (const [group, glyph, label] of REL_GROUPS) {
        const rels = wf[group];
        if (!rels?.length) continue;
        const title = `${label}: ${rels.map((r) => `${r.operationId} (${r.status})`).join(', ')}`;
        let dots = rels
            .slice(0, 5)
            .map((r) => `<span class="compact-dot rel-dot ${escAttr(r.status)}"></span>`)
            .join('');
        if (rels.length > 5) dots += `<span class="rel-more">+${rels.length - 5}</span>`;
        html += `<span class="seg rel-chip" onclick="relChipClick(event,'${escJsArg(wf.databaseId)}','${group}')" title="${escAttr(title)}">${glyph}${dots}</span>`;
    }
    return html;
};

/**
 * Badge for an auxiliary workflow (`isHead: false`), e.g. the post-commit work a process-next
 * transition enqueues beside the process.
 * @param {import('../core/state.js').Workflow} wf
 * @returns {string}
 */
export const auxiliaryBadgeHTML = (wf) =>
    isAuxiliaryWorkflow(wf)
        ? `<span class="auxiliary-badge" title="Auxiliary workflow (isHead=false): runs beside the process and is not part of the collection's head frontier">auxiliary</span>`
        : '';

const FLASH_MS = 1600;

/**
 * Scroll to and flash the first visible match — relation chips and mailbox position chips share it.
 * @param {string} selector
 * @returns {boolean} true when something was revealed
 */
export const revealFirstVisible = (selector) => {
    for (const el of document.querySelectorAll(selector)) {
        const target = /** @type {HTMLElement} */ (el);
        if (target.offsetParent === null) continue;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.remove('rel-flash');
        void target.offsetWidth; // restart the animation when flashing the same element twice
        target.classList.add('rel-flash');
        setTimeout(() => target.classList.remove('rel-flash'), FLASH_MS);
        return true;
    }
    return false;
};

/**
 * Scroll to and flash a workflow's card if one is rendered and visible in any section.
 * @param {string} wfId
 * @returns {boolean} true when a card was revealed
 */
export const revealCard = (wfId) => revealFirstVisible(`[data-wfkey="${CSS.escape(wfId)}"]`);

/**
 * Re-render every card showing this workflow (a workflow can appear in multiple sections),
 * preserving each card's compact/full mode. Scheduled cards are skipped (different builders,
 * and their relations are always loaded inline).
 * @param {string} wfKey
 */
const rerenderCards = (wfKey) => {
    const wf = workflowData[wfKey];
    if (!wf) return;
    for (const el of document.querySelectorAll(`[data-wfkey="${CSS.escape(wfKey)}"]`)) {
        const card = /** @type {HTMLElement} */ (el);
        if (card.closest('#scheduled-workflows')) continue;
        // A card playing its exit animation is about to be removed, and it no longer has a live
        // entry to tick — repainting it would replace its last elapsed with the placeholder.
        if (card.dataset.exiting) continue;
        const isStatic = !card.closest('#live-workflows');
        const compact = card.classList.contains('compact');
        setCardHTMLKeepingPipelineScroll(
            card,
            compact ? buildCompactCardHTML(wf, isStatic) : buildCardHTML(wf, isStatic),
        );
        setCardFilterData(card, wf);
    }
};

/**
 * Relation chip click: jump to the single related card when there is exactly one and it is on
 * screen; otherwise fall back to the collection filter, which groups the connected workflows.
 * @param {Event} e @param {string} wfKey @param {'dependsOn'|'dependents'|'links'} group
 */
window.relChipClick = (e, wfKey, group) => {
    e.stopPropagation();
    const wf = workflowData[wfKey];
    const rels = wf?.[group];
    if (!rels?.length) return;
    if (rels.length === 1 && revealCard(rels[0].databaseId)) return;
    if (wf.collectionKey) window.toggleLabelFilter('collectionKey', wf.collectionKey);
};

/**
 * On-demand relations fetch for cards whose source query did not eager-load them (the recent
 * section and the query tab). Mutates the shared workflow object and re-renders its cards.
 * @param {Event | null} e @param {string} wfKey
 */
window.loadRelations = async (e, wfKey) => {
    e?.stopPropagation();
    const wf = workflowData[wfKey];
    if (!wf || wf.dependsOn !== undefined) return;
    try {
        const res = await fetch(
            `/dashboard/relations?wf=${encodeURIComponent(wfKey)}&ns=${encodeURIComponent(wf.namespace)}`,
        );
        if (!res.ok) return;
        const rel = await res.json();
        if (rel.isHead !== undefined) wf.isHead = rel.isHead;
        wf.dependsOn = rel.dependsOn ?? [];
        wf.dependents = rel.dependents ?? [];
        wf.links = rel.links ?? [];
    } catch {
        return;
    }
    rerenderCards(wfKey);
};

/**
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} [isStatic]
 * @returns {string}
 */
export const buildCardHTML = (wf, isStatic) => {
    const retries = wf.steps.reduce((sum, s) => sum + s.retryCount, 0);
    let html = `<div class="card-header">`;
    html += buildLabelsHTML(wf, true);
    html += nameSpanHTML(wf, 'wf-name');
    html += `<span class="header-spacer"></span>`;
    if (retries > 0) html += `<span class="retry-badge">&#8635;${retries}</span>`;
    html += auxiliaryBadgeHTML(wf);
    html += `<span class="status-pill ${wf.status}"${isStatic ? ' style="animation:none"' : ''}>${wf.status}</span>`;
    html += buildTimestampsHTML(wf, isStatic);
    html += primaryCopyHTML(wf);
    html += buildRelationsHTML(wf, true);
    html += collectionButtonHTML(wf, true);
    html += chainIconHTML(wf);
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
    const retries = wf.steps.reduce((sum, s) => sum + s.retryCount, 0);
    let html = `<div class="compact-row">`;
    html += buildLabelsHTML(wf, true);
    html += nameSpanHTML(wf, 'compact-name');

    html += `<div class="compact-pipeline">`;
    for (const step of wf.steps) {
        const sub = stepSubLabel(step);
        const dotTitle = sub
            ? `${step.commandDetail} [${sub}] (${step.status})`
            : `${step.commandDetail} (${step.status})`;
        html += `<span class="compact-dot ${step.status}" onclick="openStepModal('${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}','${escJsArg(step.idempotencyKey)}','${escJsArg(step.commandDetail)}')" title="${escAttr(dotTitle)}"></span>`;
    }
    html += `</div>`;

    if (retries > 0) html += `<span class="retry-badge">&#8635;${retries}</span>`;
    html += auxiliaryBadgeHTML(wf);
    html += `<span class="status-pill ${wf.status} compact-pill">${wf.status}</span>`;
    html += buildTimestampsHTML(wf, isStatic);
    html += primaryCopyHTML(wf);
    html += buildRelationsHTML(wf, false);
    html += collectionButtonHTML(wf, true);
    html += chainIconHTML(wf);
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
    let html = `<div class="card-header">`;
    html += buildLabelsHTML(wf, false);
    html += nameSpanHTML(wf, 'wf-name');
    html += `<span class="header-spacer"></span>`;
    if (wf.startAt) {
        html += `<span class="elapsed" data-starts-at="${escAttr(wf.startAt)}"></span>`;
    }
    html += `<span class="status-pill scheduled" style="animation:none">Scheduled</span>`;
    html += primaryCopyHTML(wf);
    html += buildRelationsHTML(wf, false);
    html += collectionButtonHTML(wf, false);
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
    let html = `<div class="compact-row">`;
    html += buildLabelsHTML(wf, false);
    html += nameSpanHTML(wf, 'compact-name');
    html += `<div class="compact-pipeline">`;
    for (const step of wf.steps) {
        html += `<span class="compact-dot ${escAttr(step.status)}" title="${escAttr(step.commandDetail)} (${escAttr(step.status)})"></span>`;
    }
    html += `</div>`;
    if (wf.startAt) {
        html += `<span class="elapsed" data-starts-at="${escAttr(wf.startAt)}"></span>`;
    }
    html += `<span class="status-pill scheduled compact-pill" style="animation:none">Scheduled</span>`;
    html += primaryCopyHTML(wf);
    html += collectionButtonHTML(wf, false);
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
    const forceExpand = state.pendingExpand.delete(wf.databaseId);
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
export const buildFilterText = (wf) => {
    const parts = [wf.namespace, wf.operationId, wf.idempotencyKey];
    if (wf.labels) {
        for (const [k, v] of Object.entries(wf.labels)) parts.push(k, v);
    }
    if (wf.collectionKey) parts.push(wf.collectionKey);
    for (const s of wf.steps) parts.push(s.commandDetail, s.operationId);
    for (const rels of [wf.dependsOn, wf.dependents, wf.links]) {
        for (const r of rels ?? []) parts.push(r.databaseId, r.operationId);
    }
    return parts.join(' ').toLowerCase();
};

/** @param {import('../core/state.js').Workflow} wf @returns {string} */
export const buildStatusTags = (wf) => {
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
    card.classList.toggle('auxiliary', isAuxiliaryWorkflow(wf));
    card.dataset.wfkey = wf.databaseId;
    workflowData[wf.databaseId] = wf;
    card.dataset.filter = buildFilterText(wf);
    card.dataset.status = buildStatusTags(wf);
    card.dataset.namespace = wf.namespace.toLowerCase();
    if (wf.collectionKey) card.dataset.collectionkey = wf.collectionKey.toLowerCase();
    if (wf.labels) {
        card.dataset.labels = Object.entries(wf.labels)
            .map(([k, v]) => `${k}:${v}`)
            .join(',')
            .toLowerCase();
    }
};

/* Pipeline rendering — step circles, connectors, element group labels */

import { parseTransition, stepGroup, stepSubLabel } from '../core/state.js';
import { esc, escAttr, escHtml, escJsArg } from '../core/helpers.js';

/**
 * @param {import('../core/state.js').StepStatus} status
 * @returns {string}
 */
const stepIcon = (status) => {
    switch (status) {
        case 'Completed':
            return '&#10003;';
        case 'Processing':
            return '&#9673;';
        case 'Failed':
            return '&#10007;';
        case 'Requeued':
            return '&#8635;';
        case 'Waiting':
            return '&#8987;';
        case 'Canceled':
            return '&#8212;';
        default:
            return '&#9675;';
    }
};

/**
 * @param {import('../core/state.js').Step} step
 * @param {boolean} [isStatic]
 * @returns {string}
 */
const buildStepTimingHTML = (step, isStatic) => {
    if (
        step.executionStartedAt &&
        step.updatedAt &&
        (step.status === 'Completed' || step.status === 'Failed')
    ) {
        const dur = (new Date(step.updatedAt) - new Date(step.executionStartedAt)) / 1000;
        const label = dur < 1 ? `${(dur * 1000).toFixed(0)}ms` : `${dur.toFixed(1)}s`;
        return `<span class="step-timing">${label}</span>`;
    }
    if (step.status === 'Processing' && !isStatic && !step.retryCount) {
        return `<span class="step-timing">&hellip;</span>`;
    }
    return '';
};

/**
 * @param {import('../core/state.js').Workflow} wf
 * @param {import('../core/state.js').Step} step
 * @param {boolean} [isStatic]
 * @param {{ key: string, first: boolean, last: boolean, label: string|null, halfOffset: boolean }} [groupOpts]
 * @returns {string}
 */
export const buildStepNodeHTML = (wf, step, isStatic, groupOpts) => {
    let attrs = '';
    let labelHtml = '';
    if (groupOpts) {
        // The group key embeds a BPMN element id straight from the app's process file, so this is a
        // caller-supplied value in an attribute and needs escAttr, not esc. Nothing reads the value
        // back — the CSS brackets key on the attribute's presence — but it is written into markup.
        attrs = ` data-phase="${escAttr(groupOpts.key)}"`;
        if (groupOpts.first) attrs += ' data-phase-first';
        if (groupOpts.last) attrs += ' data-phase-last';
        if (groupOpts.label)
            labelHtml = `<span class="phase-label${groupOpts.halfOffset ? ' phase-label-offset' : ''}">${escHtml(groupOpts.label)}</span>`;
    }
    let html = `<div class="step-node"${attrs}>`;
    html += labelHtml;

    html +=
        `<div class="step-circle ${step.status}"` +
        ` style="cursor:pointer${isStatic ? ';animation:none;box-shadow:none' : ''}"` +
        ` onclick="openStepModal('${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}','${escJsArg(step.idempotencyKey)}','${escJsArg(step.commandDetail)}')">` +
        `${stepIcon(step.status)}</div>`;

    if (step.stateChanged) {
        html +=
            `<div class="step-state-badge"` +
            ` title="State mutated"` +
            ` onclick="openStepModal('${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}','${escJsArg(step.idempotencyKey)}','${escJsArg(step.commandDetail)}','state')">` +
            `</div>`;
    }

    const sub = stepSubLabel(step);
    html += `<div class="step-label-wrap">`;
    html += `<div class="step-label" title="${escAttr(step.commandDetail)}">${esc(step.commandDetail)}</div>`;
    if (sub) html += `<div class="step-sublabel" title="${escAttr(sub)}">${esc(sub)}</div>`;
    html += `</div>`;

    html += `<div class="step-meta">`;
    html += `<span class="step-type ${escAttr(step.commandType)}">${esc(step.commandType)}</span>`;
    if (step.retryCount > 0) {
        html += `<div class="step-retry">&#8635;${step.retryCount}</div>`;
    }
    const isBackedOff = step.status === 'Requeued' || step.status === 'Waiting';
    const backoff = step.backoffUntil || (isBackedOff ? wf.backoffUntil : null);
    if (isBackedOff && backoff) {
        const action =
            step.status === 'Waiting'
                ? 'check now (skip wait timer)'
                : 'Retry now (skip backoff timer)';
        const label = step.status === 'Waiting' ? 'check now' : 'retry now';
        html += `<span class="step-backoff" data-backoff="${escAttr(backoff)}"></span>`;
        html += `<button class="nudge-btn" onclick="nudgeWorkflow(event,'${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}')" title="${action}">${label}</button>`;
    }
    if (isBackedOff) {
        const failTitle =
            step.status === 'Waiting'
                ? 'Fail now (stop waiting, mark the step Failed)'
                : 'Fail now (stop retrying, mark the step Failed)';
        html += `<button class="fail-btn" onclick="failWorkflow(event,'${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}')" title="${failTitle}">fail</button>`;
    }
    if (step.status === 'Failed') {
        html += `<button class="retry-btn" onclick="retryWorkflow(event,'${escJsArg(wf.databaseId)}','${escJsArg(wf.namespace)}')" title="Retry this workflow">&#8635; Retry</button>`;
    }
    html += buildStepTimingHTML(step, isStatic);
    html += `</div></div>`;

    return html;
};

/**
 * @param {import('../core/state.js').Step} prev
 * @param {import('../core/state.js').Step} cur
 * @param {boolean} [isStatic]
 * @returns {string}
 */
const buildConnectorHTML = (prev, cur, isStatic) => {
    const prevDone = prev.status === 'Completed';
    const curActive =
        cur.status === 'Processing' || cur.status === 'Requeued' || cur.status === 'Waiting';
    const isLeadingEdge = prevDone && curActive;

    const lineClass = isStatic
        ? prevDone
            ? 'active'
            : ''
        : isLeadingEdge
          ? 'processing'
          : prevDone
            ? 'active'
            : '';
    const staticLine = isStatic || (prevDone && !isLeadingEdge);

    return (
        `<div class="step-connector"><svg viewBox="0 0 56 6">` +
        `<line x1="0" y1="3" x2="56" y2="3" class="${lineClass}"` +
        (staticLine ? ' style="animation:none"' : '') +
        `/></svg></div>`
    );
};

/**
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} [isStatic]
 * @returns {string}
 */
export const buildPipelineHTML = (wf, isStatic) => {
    const { steps } = wf;
    if (!steps?.length) return '';

    const tx = parseTransition(wf);

    if (!tx) {
        let html = `<div class="pipeline${isStatic ? ' pipeline-static' : ''}">`;
        steps.forEach((step, i) => {
            if (i > 0) html += buildConnectorHTML(steps[i - 1], step, isStatic);
            html += buildStepNodeHTML(wf, step, isStatic);
        });
        html += '</div>';
        return html;
    }

    const groups = steps.map((s) => stepGroup(s, tx));
    const keys = groups.map((g) => (g ? g.key : null));

    const labelAt = new Map();
    let groupStart = -1;
    let groupKey = null;
    for (let i = 0; i <= steps.length; i++) {
        const k = i < steps.length ? keys[i] : null;
        if (k !== groupKey) {
            if (groupKey !== null && groupStart >= 0) {
                const count = i - groupStart;
                const mid = groupStart + Math.floor((count - 1) / 2);
                labelAt.set(mid, count % 2 === 0);
            }
            groupStart = k !== null ? i : -1;
            groupKey = k;
        }
    }

    // The grouped padding reserves headroom for the bracket labels — skip it when
    // no step belongs to a group (e.g. a lone side-effect step), the brackets never render.
    const hasPhases = keys.some((k) => k !== null);
    let html = `<div class="pipeline${hasPhases ? ' pipeline-grouped' : ''}${isStatic ? ' pipeline-static' : ''}">`;
    steps.forEach((step, i) => {
        if (i > 0) html += buildConnectorHTML(steps[i - 1], step, isStatic);

        const group = groups[i];
        const key = keys[i];
        const isFirst = key !== null && key !== (i > 0 ? keys[i - 1] : null);
        const isLast = key !== null && key !== (i < steps.length - 1 ? keys[i + 1] : null);

        const hasLabel = labelAt.has(i);
        html += buildStepNodeHTML(
            wf,
            step,
            isStatic,
            group
                ? {
                      key: group.key,
                      first: isFirst,
                      last: isLast,
                      label: hasLabel ? group.label : null,
                      halfOffset: hasLabel && labelAt.get(i),
                  }
                : null,
        );
    });
    html += '</div>';
    return html;
};

/**
 * Replaces a card's inner HTML while keeping its pipeline scrolled where the operator left it.
 * A rebuild swaps the `.pipeline` element, and a fresh element starts at scrollLeft 0 — so without
 * this every retry or deferral write-back snapped a sideways-scrolled pipeline back to its start.
 * Callers that want the active step centered instead call {@link scrollPipelineToActive} afterwards.
 * @param {HTMLElement} card
 * @param {string} html
 */
export const setCardHTMLKeepingPipelineScroll = (card, html) => {
    const before = /** @type {HTMLElement | null} */ (card.querySelector('.pipeline'));
    const scrollLeft = before ? before.scrollLeft : 0;
    card.innerHTML = html;
    if (scrollLeft > 0) {
        const after = /** @type {HTMLElement | null} */ (card.querySelector('.pipeline'));
        if (after) after.scrollLeft = scrollLeft;
    }
};

/** @param {HTMLElement} card */
export const scrollPipelineToActive = (card) => {
    const p = card.querySelector('.pipeline');
    if (!p) return;
    const active =
        p.querySelector('.step-circle.Processing') ||
        p.querySelector('.step-circle.Requeued') ||
        p.querySelector('.step-circle.Waiting');
    if (active) {
        const node = /** @type {HTMLElement | null} */ (active.closest('.step-node'));
        if (node) {
            // @ts-ignore — scrollLeft exists on Element but TS wants HTMLElement
            p.scrollLeft = Math.max(
                0,
                node.offsetLeft - p.offsetLeft - p.clientWidth / 2 + node.offsetWidth / 2,
            );
            return;
        }
    }
    // @ts-ignore
    p.scrollLeft = p.scrollWidth;
};

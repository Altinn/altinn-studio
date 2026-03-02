/* Pipeline rendering — step circles, connectors, phase labels */

import { parseTransition, stepPhase, stepSubLabel } from '../core/state.js';
import { esc, escHtml } from '../core/helpers.js';

/**
 * @param {import('../core/state.js').StepStatus} status
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
 * @param {import('../core/state.js').Step} step
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
 * @param {import('../core/state.js').Workflow} wf
 * @param {import('../core/state.js').Step} step
 * @param {boolean} [isStatic]
 * @param {{ phase: string, first: boolean, last: boolean, label: string|null, halfOffset: boolean }} [phaseOpts]
 * @returns {string}
 */
export const buildStepNodeHTML = (wf, step, isStatic, phaseOpts) => {
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

  if (step.stateChanged) {
    html += `<div class="step-state-badge"`
      + ` title="State mutated"`
      + ` onclick="openStepModal('${esc(wf.idempotencyKey)}','${esc(step.idempotencyKey)}','${esc(step.commandDetail)}','${esc(wf.createdAt)}','state')">`
      + `</div>`;
  }

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
    html += `<button class="skip-backoff-btn" onclick="skipBackoff(event,'${esc(wf.idempotencyKey)}','${esc(step.idempotencyKey)}')" title="Skip backoff timer">skip</button>`;
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
 * @param {import('../core/state.js').Workflow} wf
 * @param {boolean} [isStatic]
 * @returns {string}
 */
export const buildPipelineHTML = (wf, isStatic) => {
  const { steps } = wf;
  if (!steps?.length) return '';

  const tx = parseTransition(wf);

  if (!tx) {
    let html = '<div class="pipeline">';
    steps.forEach((step, i) => {
      if (i > 0) html += buildConnectorHTML(steps[i - 1], step, isStatic);
      html += buildStepNodeHTML(wf, step, isStatic);
    });
    html += '</div>';
    return html;
  }

  const phases = steps.map(s => stepPhase(s.commandDetail));
  /** @param {string} phase @returns {string} */
  const phaseLabel = (phase) => {
    if (phase === 'end') return tx.from;
    if (phase === 'start') return tx.to;
    if (phase === 'process-end') return 'End Event';
    return '';
  };

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

/** @param {HTMLElement} card */
export const scrollPipelineToActive = (card) => {
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

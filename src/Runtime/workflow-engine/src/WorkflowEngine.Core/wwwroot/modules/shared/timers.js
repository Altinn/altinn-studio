/* Timers — workflow elapsed, step backoff countdowns, the step modal's running counter, and the
 * two mailbox counters (a deadline counting down, a parked receiver counting up) */

import { state } from '../core/state.js';
import { formatElapsed, formatSpan } from '../core/helpers.js';

/**
 * How long a live workflow's current attempt has been running — or, for one the engine has not
 * stamped yet, how long it has been waiting since it was created.
 * @param {import('../core/state.js').Workflow} wf
 * @param {number} [now]
 */
export const elapsedLabel = (wf, now = Date.now()) =>
    formatElapsed(
        Math.max(0, (now - new Date(wf.executionStartedAt || wf.createdAt).getTime()) / 1000),
    );

export const updateTimers = () => {
    const now = Date.now();

    // Anchored on the live copy and re-read every frame: `executionStartedAt` moves to the start of
    // each new attempt, so a cached anchor would keep counting from a previous one. A workflow the
    // live section has dropped is not found here at all — its card was stamped with its final
    // elapsed on the way out.
    for (const el of document.querySelectorAll('[data-timer]')) {
        const wf = state.previousWorkflows[el.getAttribute('data-timer') ?? ''];
        if (wf) el.textContent = elapsedLabel(wf, now);
    }

    for (const el of document.querySelectorAll('[data-backoff]')) {
        const remaining = (new Date(el.getAttribute('data-backoff') ?? '').getTime() - now) / 1000;
        el.textContent = remaining > 0 ? `retry ${remaining.toFixed(1)}s` : 'retrying...';
    }

    // The step modal's Processing counter: how long the current attempt has been running.
    for (const el of document.querySelectorAll('[data-step-started]')) {
        const started = new Date(el.getAttribute('data-step-started') ?? '').getTime();
        if (Number.isNaN(started)) continue;
        el.textContent = `running ${formatElapsed(Math.max(0, (now - started) / 1000))}`;
    }

    for (const el of document.querySelectorAll('[data-starts-at]')) {
        const remaining =
            (new Date(el.getAttribute('data-starts-at') ?? '').getTime() - now) / 1000;
        el.textContent = remaining > 0 ? `starts in ${formatElapsed(remaining)}` : 'starting...';
    }

    // Counts down: what an operator wants from a deadline is how long is left.
    for (const el of document.querySelectorAll('[data-deadline]')) {
        const deadline = new Date(el.getAttribute('data-deadline') ?? '').getTime();
        if (Number.isNaN(deadline)) continue;
        const remaining = (deadline - now) / 1000;
        el.textContent =
            remaining > 0
                ? `closes in ${formatSpan(remaining)}`
                : `overdue ${formatSpan(-remaining)}`;
        el.classList.toggle('mbx-overdue', remaining <= 0);
    }

    // A receiver still parked has no park duration to state — the server sends none — so the card counts up.
    for (const el of document.querySelectorAll('[data-parked-since]')) {
        const since = new Date(el.getAttribute('data-parked-since') ?? '').getTime();
        el.textContent = Number.isNaN(since) ? '' : formatSpan((now - since) / 1000);
    }

    requestAnimationFrame(updateTimers);
};

/* Timers — workflow elapsed, step backoff countdowns, and the two mailbox counters
 * (a deadline counting down, a parked receiver counting up) */

import { state } from '../core/state.js';
import { formatElapsed, formatSpan } from '../core/helpers.js';

export const updateTimers = () => {
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
        const remaining =
            (new Date(el.getAttribute('data-starts-at') ?? '').getTime() - now) / 1000;
        el.textContent = remaining > 0 ? `starts in ${formatElapsed(remaining)}` : 'starting...';
    }

    // A mailbox's deadline is the only bound on an exchange, so it counts down: what an operator wants is how
    // long is left, and past the deadline the overcount is the sweep's lateness.
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

/* Throttled namespaces — failure-storm circuit breakers (observability + force overrides).
 * Polls GET /api/v1/throttles and renders a panel listing every namespace breaker (open,
 * recovering, or lingering closed). The force-open / force-close buttons call the manual
 * override endpoints POST /api/v1/{ns}/throttle/open|close with a two-click confirm. The
 * section is hidden entirely while no breaker state exists — the common case. */

import { esc, escJsArg, fmtAgo, fmtDuration } from '../core/helpers.js';

/**
 * @typedef {Object} NamespaceThrottle
 * @property {string} namespace
 * @property {'Open'|'HalfOpen'|'Closed'} state
 * @property {string} trippedAt
 * @property {string} currentWindow
 * @property {number} canaryCount
 * @property {string} [lastEvaluatedAt]
 * @property {number} lastRequeuedCount
 * @property {number} lastActiveCount
 * @property {string} [updatedAt]
 */

const POLL_INTERVAL_MS = 10000;
const CONFIRM_REVERT_MS = 3000;

const stateLabel = { Open: 'Open', HalfOpen: 'Recovering', Closed: 'Closed' };

/** Starts the poll loop. Called once from app.js init(). */
export const initThrottles = () => {
    loadThrottles();
    setInterval(loadThrottles, POLL_INTERVAL_MS);
};

export const loadThrottles = async () => {
    try {
        const res = await fetch('/api/v1/throttles');
        /** @type {NamespaceThrottle[]} */
        const throttles = res.status === 200 ? await res.json() : [];
        renderThrottles(throttles);
    } catch {
        /* non-critical — retry next poll */
    }
};

/** @param {NamespaceThrottle[]} throttles */
const renderThrottles = (throttles) => {
    const section = document.getElementById('throttle-section');
    const list = document.getElementById('throttle-list');
    const count = document.getElementById('throttle-count');
    if (!section || !list || !count) return;

    if (throttles.length === 0) {
        section.style.display = 'none';
        list.innerHTML = '';
        count.textContent = '';
        return;
    }

    section.style.display = '';
    count.textContent = `(${throttles.length})`;

    list.innerHTML = throttles
        .map((t) => {
            const open = t.state === 'Open';
            const closed = t.state === 'Closed';
            const actions = [
                !open
                    ? `<button class="throttle-action open" onclick="throttleAction('open', '${escJsArg(t.namespace)}', this)">Force open</button>`
                    : '',
                !closed
                    ? `<button class="throttle-action close" onclick="throttleAction('close', '${escJsArg(t.namespace)}', this)">Force close</button>`
                    : '',
            ].join('');

            return `
        <div class="throttle-row">
            <span class="throttle-state ${esc(t.state)}" title="Breaker state">${stateLabel[t.state] ?? esc(t.state)}</span>
            <span class="throttle-ns" title="${esc(t.namespace)}">${esc(t.namespace)}</span>
            <span class="throttle-meta" title="When the breaker last tripped">tripped ${fmtAgo(t.trippedAt) || '—'}</span>
            <span class="throttle-meta" title="Current throttle window">window ${fmtDuration(t.currentWindow) || t.currentWindow}</span>
            <span class="throttle-meta" title="Canaries probing on the normal retry schedule">${t.canaryCount} ${t.canaryCount === 1 ? 'canary' : 'canaries'}</span>
            <span class="throttle-meta" title="Requeued / active workflows at the last sweep evaluation">${t.lastRequeuedCount} requeued / ${t.lastActiveCount} active</span>
            <span class="throttle-spacer"></span>
            ${actions}
        </div>`;
        })
        .join('');
};

/**
 * Two-click confirm, then POST the override. First click arms the button ("Confirm?"),
 * a second click within the revert window performs the action.
 * @param {'open'|'close'} action
 * @param {string} ns
 * @param {HTMLButtonElement} btn
 */
const throttleAction = async (action, ns, btn) => {
    if (btn.dataset.armed !== '1') {
        btn.dataset.armed = '1';
        const original = btn.textContent;
        btn.textContent = 'Confirm?';
        btn.classList.add('armed');
        setTimeout(() => {
            if (btn.isConnected && btn.dataset.armed === '1') {
                btn.dataset.armed = '';
                btn.textContent = original;
                btn.classList.remove('armed');
            }
        }, CONFIRM_REVERT_MS);
        return;
    }

    btn.dataset.armed = '';
    btn.disabled = true;
    btn.textContent = '...';
    try {
        const res = await fetch(`/api/v1/${encodeURIComponent(ns)}/throttle/${action}`, { method: 'POST' });
        if (res.ok) {
            await loadThrottles();
        } else {
            btn.textContent = 'Failed';
            btn.classList.add('failed');
            setTimeout(loadThrottles, CONFIRM_REVERT_MS);
        }
    } catch {
        btn.textContent = 'Error';
        btn.classList.add('failed');
        setTimeout(loadThrottles, CONFIRM_REVERT_MS);
    }
};

// Inline onclick handlers (rows are rendered as HTML strings)
window.throttleAction = throttleAction;

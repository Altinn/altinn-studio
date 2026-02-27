/* Timers — workflow elapsed + step backoff countdowns */

import { state } from '../core/state.js';
import { formatElapsed } from '../core/helpers.js';

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
    el.textContent = remaining > 0 ? `retry ${remaining.toFixed(1)}s` : formatElapsed(-remaining);
  }

  for (const el of document.querySelectorAll('[data-step-started]')) {
    const elapsed = (now - new Date(el.getAttribute('data-step-started') ?? '').getTime()) / 1000;
    el.textContent = elapsed > 0 ? formatElapsed(elapsed) : '';
  }

  for (const el of document.querySelectorAll('[data-starts-at]')) {
    const remaining = (new Date(el.getAttribute('data-starts-at') ?? '').getTime() - now) / 1000;
    el.textContent = remaining > 0 ? `starts in ${formatElapsed(remaining)}` : 'starting...';
  }

  requestAnimationFrame(updateTimers);
};

import type { FocusEvent } from 'react';

/** Keep the value visible with its focused Edit button when the summary fits in the viewport. */
export function scrollSummaryIntoView(event: FocusEvent<HTMLButtonElement>) {
  const summary = event.currentTarget.closest<HTMLElement>('[data-summary-container]');
  if (!summary) {
    return;
  }
  const bounds = summary.getBoundingClientRect();
  if (bounds.height <= window.innerHeight && (bounds.top < 0 || bounds.bottom > window.innerHeight)) {
    summary.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

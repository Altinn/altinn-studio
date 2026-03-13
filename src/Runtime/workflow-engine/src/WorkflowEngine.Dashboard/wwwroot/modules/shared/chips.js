/* Selection-only chip bars (party/guid) */

import { state } from '../core/state.js';

/**
 * Rebuild chips from selection only (not all visible cards).
 * @param {HTMLElement} container
 * @param {Set<string>} filterSet
 * @param {string} chipClass
 * @param {(v: string) => string} [labelFn]
 */
export const rebuildSelectedOnlyChips = (container, filterSet, chipClass, labelFn) => {
  const sorted = [...filterSet].sort();
  const prev = container.dataset.values || '';
  const next = sorted.join(',');
  if (prev === next) return;
  container.dataset.values = next;
  container.innerHTML = '';
  for (const v of sorted) {
    const btn = document.createElement('button');
    btn.className = `chip ${chipClass} active`;
    btn.dataset.value = v;
    btn.textContent = labelFn ? labelFn(v) : v;
    btn.title = v;
    container.appendChild(btn);
  }
};

/** @param {HTMLElement} container @param {(value: string) => void} toggle */
export const wireChipBar = (container, toggle) => {
  container.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.chip'));
    if (!chip) return;
    toggle(chip.dataset.value || '');
  });
};

export const updatePartyGuidLabels = () => {
  /** @type {HTMLElement} */ (document.getElementById('label-party')).style.display = state.partyFilter.size > 0 ? '' : 'none';
  /** @type {HTMLElement} */ (document.getElementById('label-guid')).style.display = state.guidFilter.size > 0 ? '' : 'none';
};

/* Recent workflows — rendered from backend cache */

import { dom, state } from '../core/state.js';
import { cssId } from '../core/helpers.js';
import { buildCardHTML, buildCompactCardHTML, setCardFilterData } from '../shared/cards.js';

/** Late-bound references */
/** @type {() => void} */
let _mergeDiscoveredOrgsAndApps = () => {};
/** @type {() => void} */
let _applyFilter = () => {};

/** @param {{ mergeDiscoveredOrgsAndApps: () => void, applyFilter: () => void }} fns */
export const bindRecentCallbacks = (fns) => {
  _mergeDiscoveredOrgsAndApps = fns.mergeDiscoveredOrgsAndApps;
  _applyFilter = fns.applyFilter;
};

/** @param {import('../core/state.js').Workflow[]} recent */
export const updateRecentWorkflows = (recent) => {
  const list = recent ?? [];
  state.recentWorkflows = list;
  const recentN = list.length;

  dom.recentEmpty.style.display = recentN === 0 ? 'block' : 'none';

  // Only update if the set of keys changed
  const newKeys = list.map(r => r.idempotencyKey).join(',');
  if (newKeys === state.lastRecentKeys) return;

  const isFirstLoad = state.lastRecentKeys === '';
  const previousKeys = new Set(state.lastRecentKeys.split(',').filter(Boolean));
  state.lastRecentKeys = newKeys;

  // Remove cards no longer in the list
  for (const key of previousKeys) {
    if (!list.some(w => w.idempotencyKey === key)) {
      document.getElementById(`wf-recent-${cssId(key)}`)?.remove();
    }
  }

  // Add new cards, skip existing ones
  for (let i = 0; i < list.length; i++) {
    const wf = list[i];
    const elId = `wf-recent-${cssId(wf.idempotencyKey)}`;
    const existing = document.getElementById(elId);

    if (existing) {
      // Ensure correct order
      if (existing !== dom.recentContainer.children[i]) {
        dom.recentContainer.insertBefore(existing, dom.recentContainer.children[i] ?? null);
      }
      continue;
    }

    const card = document.createElement('div');
    const forceExpand = state.pendingExpand.delete(wf.idempotencyKey);
    const compact = state.compactSections.recent && !forceExpand;
    card.className = `workflow-card${compact ? ' compact' : ''}`;
    card.id = elId;
    if (!isFirstLoad) {
      const glowName = wf.status === 'Failed' ? 'recent-glow-fail' : 'recent-glow';
      card.style.animation = compact
        ? `${glowName} 0.6s ease forwards`
        : `recent-enter 0.3s ease both, ${glowName} 0.6s ease forwards`;
      card.addEventListener('animationend', () => { card.style.animation = 'none'; }, { once: true });
    }
    card.innerHTML = compact ? buildCompactCardHTML(wf, true) : buildCardHTML(wf, true);
    setCardFilterData(card, wf);
    dom.recentContainer.insertBefore(card, dom.recentContainer.children[i] ?? null);
  }
  _mergeDiscoveredOrgsAndApps();
  _applyFilter();
};

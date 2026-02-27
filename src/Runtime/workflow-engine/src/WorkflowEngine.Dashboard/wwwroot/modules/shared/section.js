/* Section collapse/expand, compact/full toggle, card expand/collapse */

import { dom, state, workflowData } from '../core/state.js';
import { cssId } from '../core/helpers.js';
import { buildCardHTML, buildCompactCardHTML, buildScheduledCardHTML, buildCompactScheduledCardHTML, setCardFilterData } from './cards.js';
import { scrollPipelineToActive } from './pipeline.js';

/** Late-bound references */
/** @type {() => Promise<void>} */
let _loadScheduled = async () => {};
/** @type {() => Promise<void>} */
let _loadQuery = async () => {};
/** @type {() => void} */
let _syncUrl = () => {};

/** @param {{ loadScheduled: () => Promise<void>, loadQuery: () => Promise<void>, syncUrl: () => void }} fns */
export const bindSectionCallbacks = (fns) => {
  _loadScheduled = fns.loadScheduled;
  _loadQuery = fns.loadQuery;
  _syncUrl = fns.syncUrl;
};

/* ── Section collapse/expand ─────────────────────────────── */

/** @param {string} sectionId */
window.toggleSection = (sectionId) => {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.classList.toggle('collapsed');
  const collapsed = section.classList.contains('collapsed');
  try { localStorage.setItem(`section:${sectionId}`, collapsed ? '1' : '0'); } catch { /* ignore */ }
  _syncUrl();
  if (sectionId === 'scheduled-section' && !collapsed) _loadScheduled();
};

// Restore saved collapse states
for (const id of ['scheduled-section', 'live-section', 'recent-section']) {
  try {
    const saved = localStorage.getItem(`section:${id}`);
    if (saved !== null) {
      document.getElementById(id)?.classList.toggle('collapsed', saved === '1');
    }
  } catch { /* ignore */ }
}

/* ── Compact view toggle ─────────────────────────────────── */

/** @param {string} section */
window.collapseAll = (section) => {
  state.compactSections[section] = true;
  try { localStorage.setItem(`compact:${section}`, '1'); } catch { /* ignore */ }
  rebuildSectionCards(section);
  _syncUrl();
};

/** @param {string} section */
window.fullAll = (section) => {
  state.compactSections[section] = false;
  try { localStorage.setItem(`compact:${section}`, '0'); } catch { /* ignore */ }
  rebuildSectionCards(section);
  _syncUrl();
};

/** @param {string} section */
const rebuildSectionCards = (section) => {
  const compact = state.compactSections[section];
  if (section === 'inbox') {
    for (const [key, wf] of Object.entries(state.previousWorkflows)) {
      const card = document.getElementById(`wf-${cssId(key)}`);
      if (card && !card.dataset.exiting) {
        card.className = `workflow-card${compact ? ' compact' : ''}`;
        card.innerHTML = compact ? buildCompactCardHTML(wf) : buildCardHTML(wf);
        setCardFilterData(card, wf);
        if (!compact) scrollPipelineToActive(card);
      }
    }
  } else if (section === 'recent') {
    for (const wf of state.recentWorkflows) {
      const card = document.getElementById(`wf-recent-${cssId(wf.idempotencyKey)}`);
      if (card) {
        card.className = `workflow-card${compact ? ' compact' : ''}`;
        card.innerHTML = compact ? buildCompactCardHTML(wf, true) : buildCardHTML(wf, true);
        setCardFilterData(card, wf);
      }
    }
  } else if (section === 'scheduled') {
    if (!dom.scheduledSection.classList.contains('collapsed')) _loadScheduled();
  } else if (section === 'query') {
    if (state.queryLoaded) _loadQuery();
  }
};

/* ── Compact card expand/collapse (click to toggle) ──────── */

/**
 * @param {HTMLElement} container
 * @param {string} section
 * @param {boolean} isStatic
 * @param {boolean} [isScheduled]
 */
const setupCardExpand = (container, section, isStatic, isScheduled) => {
  container.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (target.closest('.seg, .compact-dot, .step-circle, .open-btn, a, button, .pipeline, .compact-pipeline')) return;

    const card = /** @type {HTMLElement | null} */ (target.closest('.workflow-card'));
    if (!card) return;

    const wf = workflowData[card.dataset.wfkey || ''];
    if (!wf) return;

    const isCompact = card.classList.contains('compact');
    if (isCompact) {
      card.className = 'workflow-card';
      card.style.animation = 'none';
      card.innerHTML = isScheduled ? buildScheduledCardHTML(wf) : buildCardHTML(wf, isStatic);
      if (!isStatic) scrollPipelineToActive(card);
    } else {
      card.className = 'workflow-card compact';
      card.style.animation = 'none';
      card.innerHTML = isScheduled ? buildCompactScheduledCardHTML(wf) : buildCompactCardHTML(wf, isStatic);
    }
    setCardFilterData(card, wf);
    _syncUrl();
  });
};

setupCardExpand(dom.liveContainer, 'inbox', false);
setupCardExpand(dom.recentContainer, 'recent', true);
setupCardExpand(dom.scheduledContainer, 'scheduled', true, true);
setupCardExpand(dom.queryContainer, 'query', true);

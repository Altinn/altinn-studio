/* Searchable multi-select dropdown component */

import { dom, state } from '../core/state.js';
import { esc } from '../core/helpers.js';

/**
 * Rebuild dropdown list items.
 * @param {HTMLElement} listEl
 * @param {Set<string>} allValues
 * @param {Set<string>} filterSet
 */
export const rebuildDropdown = (listEl, allValues, filterSet) => {
  const sorted = [...allValues].sort();
  listEl.innerHTML = '';
  if (sorted.length > 0) {
    const row = document.createElement('div');
    row.className = 'dropdown-actions';
    const selAll = document.createElement('span');
    selAll.className = 'dropdown-action';
    selAll.textContent = 'Select all';
    selAll.dataset.action = 'select-all';
    if (filterSet.size === sorted.length) selAll.classList.add('dim');
    const clearAll = document.createElement('span');
    clearAll.className = 'dropdown-action';
    clearAll.textContent = 'Clear all';
    clearAll.dataset.action = 'clear';
    if (filterSet.size === 0) clearAll.classList.add('dim');
    row.appendChild(selAll);
    row.appendChild(clearAll);
    listEl.appendChild(row);
  }
  for (const v of sorted) {
    const item = document.createElement('div');
    item.className = `dropdown-item${filterSet.has(v) ? ' selected' : ''}`;
    item.dataset.value = v;
    item.textContent = v;
    listEl.appendChild(item);
  }
};

/**
 * Update the toggle button to show selected chips.
 * @param {'org' | 'app'} which
 */
export const updateDropdownToggle = (which) => {
  const filterSet = which === 'org' ? state.orgFilter : state.appFilter;
  const selectedEl = which === 'org' ? dom.orgSelected : dom.appSelected;
  const dropdown = which === 'org' ? dom.orgDropdown : dom.appDropdown;

  if (filterSet.size === 0) {
    selectedEl.innerHTML = '';
    dropdown.classList.remove('has-selection');
  } else {
    selectedEl.innerHTML = [...filterSet].sort().map(v => `<span class="mini-chip">${esc(v)}</span>`).join('');
    dropdown.classList.add('has-selection');
  }
};

/** @param {HTMLElement} dropdown @param {string} query */
export const filterDropdownList = (dropdown, query) => {
  const q = query.toLowerCase();
  for (const item of dropdown.querySelectorAll('.dropdown-item')) {
    /** @type {HTMLElement} */ (item).classList.toggle('hidden', q !== '' && !(/** @type {HTMLElement} */ (item).dataset.value || '').includes(q));
  }
};

/** @param {string} dropdownId */
window.toggleDropdown = (dropdownId) => {
  const el = document.getElementById(dropdownId);
  if (!el) return;
  if (el.classList.contains('disabled')) return;
  const wasOpen = el.classList.contains('open');
  for (const d of document.querySelectorAll('.dropdown.open')) d.classList.remove('open');
  if (!wasOpen) {
    el.classList.add('open');
    const search = el.querySelector('.dropdown-search');
    if (search) { /** @type {HTMLInputElement} */ (search).value = ''; /** @type {HTMLInputElement} */ (search).focus(); filterDropdownList(el, ''); }
  }
};

// Wire dropdown search inputs
for (const dd of document.querySelectorAll('.dropdown')) {
  const searchInput = dd.querySelector('.dropdown-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => filterDropdownList(/** @type {HTMLElement} */ (dd), /** @type {HTMLInputElement} */ (e.target).value));
    searchInput.addEventListener('click', (e) => e.stopPropagation());
  }
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  const target = /** @type {HTMLElement} */ (e.target);
  if (!target.closest('.dropdown')) {
    for (const d of document.querySelectorAll('.dropdown.open')) d.classList.remove('open');
  }
});

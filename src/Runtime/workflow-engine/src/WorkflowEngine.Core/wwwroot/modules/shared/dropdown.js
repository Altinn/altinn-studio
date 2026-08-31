/* Searchable multi-select dropdown component */

import { dom, state } from '../core/state.js';
import { esc } from '../core/helpers.js';

/** @type {(v: string) => string} */
const identity = (v) => v;

/**
 * Rebuild dropdown list items.
 * @param {HTMLElement} listEl
 * @param {Set<string>} allValues
 * @param {Set<string>} filterSet
 * @param {(v: string) => string} [labelFn] - maps a raw value to its display text
 */
export const rebuildDropdown = (listEl, allValues, filterSet, labelFn = identity) => {
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
        item.textContent = labelFn(v);
        listEl.appendChild(item);
    }
};

/**
 * Update the toggle button to show selected chips.
 * @param {Set<string>} filterSet
 * @param {HTMLElement} selectedEl
 * @param {HTMLElement} dropdown
 * @param {(v: string) => string} [labelFn] - maps a raw value to its display text
 */
export const updateDropdownToggle = (filterSet, selectedEl, dropdown, labelFn = identity) => {
    if (filterSet.size === 0) {
        selectedEl.innerHTML = '';
        dropdown.classList.remove('has-selection');
    } else {
        selectedEl.innerHTML = [...filterSet]
            .sort()
            .map((v) => `<span class="mini-chip">${esc(labelFn(v))}</span>`)
            .join('');
        dropdown.classList.add('has-selection');
    }
};

/** @param {HTMLElement} dropdown @param {string} query */
export const filterDropdownList = (dropdown, query) => {
    const q = query.toLowerCase();
    for (const item of dropdown.querySelectorAll('.dropdown-item')) {
        const el = /** @type {HTMLElement} */ (item);
        const haystack = `${el.dataset.value || ''} ${el.textContent || ''}`.toLowerCase();
        el.classList.toggle('hidden', q !== '' && !haystack.includes(q));
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
        if (search) {
            /** @type {HTMLInputElement} */ (search).value = '';
            /** @type {HTMLInputElement} */ (search).focus();
            filterDropdownList(el, '');
        }
    }
};

// Wire dropdown search inputs
for (const dd of document.querySelectorAll('.dropdown')) {
    const searchInput = dd.querySelector('.dropdown-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) =>
            filterDropdownList(
                /** @type {HTMLElement} */ (dd),
                /** @type {HTMLInputElement} */ (e.target).value,
            ),
        );
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

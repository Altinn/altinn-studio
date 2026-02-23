/* Settings modal — preferences that persist to localStorage */

import { isUtcMode, toggleUtcMode } from '../core/helpers.js';

const modal = /** @type {HTMLElement} */ (document.getElementById('settings-modal'));
const utcCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('setting-utc'));

// Init checkbox from stored preference
utcCheckbox.checked = isUtcMode();

utcCheckbox.addEventListener('change', () => {
  toggleUtcMode();
});

window.openSettings = () => {
  utcCheckbox.checked = isUtcMode();
  modal.classList.add('open');
};

window.closeSettings = () => modal.classList.remove('open');

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    window.closeSettings();
  }
});

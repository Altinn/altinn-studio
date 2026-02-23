/* Settings modal — preferences that persist to localStorage */

import { isUtcMode, toggleUtcMode, showTimestamps, setShowTimestamps } from '../core/helpers.js';

const modal = /** @type {HTMLElement} */ (document.getElementById('settings-modal'));
const timestampsCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('setting-timestamps'));
const utcCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('setting-utc'));

// Init from stored preferences
timestampsCheckbox.checked = showTimestamps();
utcCheckbox.checked = isUtcMode();
if (!showTimestamps()) document.body.classList.add('hide-timestamps');

timestampsCheckbox.addEventListener('change', () => {
  setShowTimestamps(timestampsCheckbox.checked);
});

utcCheckbox.addEventListener('change', () => {
  toggleUtcMode();
});

window.openSettings = () => {
  timestampsCheckbox.checked = showTimestamps();
  utcCheckbox.checked = isUtcMode();
  modal.classList.add('open');
};

window.closeSettings = () => modal.classList.remove('open');

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    window.closeSettings();
  }
});

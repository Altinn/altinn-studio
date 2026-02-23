/* Theme toggle — dark / altinn */

import { dom } from '../core/state.js';

const MOON_SVG = '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8A9.06 9.06 0 0 0 12 3z"/>';
const SUN_SVG = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

export const getTheme = () => document.documentElement.getAttribute('data-theme') || '';

export const updateThemeToggle = (/** @type {string} */ theme) => {
  if (!dom.themeIcon || !dom.themeLabel) return;
  if (theme === 'altinn') {
    dom.themeIcon.innerHTML = MOON_SVG;
    dom.themeIcon.setAttribute('fill', 'currentColor');
    dom.themeIcon.removeAttribute('stroke');
    dom.themeIcon.removeAttribute('stroke-width');
    dom.themeIcon.removeAttribute('stroke-linecap');
    dom.themeIcon.removeAttribute('stroke-linejoin');
    dom.themeLabel.textContent = 'Dark';
  } else {
    dom.themeIcon.innerHTML = SUN_SVG;
    dom.themeIcon.setAttribute('fill', 'none');
    dom.themeIcon.setAttribute('stroke', 'currentColor');
    dom.themeIcon.setAttribute('stroke-width', '2');
    dom.themeIcon.setAttribute('stroke-linecap', 'round');
    dom.themeIcon.setAttribute('stroke-linejoin', 'round');
    dom.themeLabel.textContent = 'Altinn';
  }
};

export const setTheme = (/** @type {string} */ theme) => {
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme');
  try { if (theme) localStorage.setItem('theme', theme); else localStorage.removeItem('theme'); } catch { /* ignore */ }
  updateThemeToggle(theme);
};

/** Late-bound syncUrl reference */
/** @type {() => void} */
let _syncUrl = () => {};

/** @param {{ syncUrl: () => void }} fns */
export const bindThemeCallbacks = (fns) => { _syncUrl = fns.syncUrl; };

/** @type {() => void} */
export const toggleTheme = () => { setTheme(getTheme() === 'altinn' ? '' : 'altinn'); _syncUrl(); };

// @ts-ignore — exposed for inline onclick
window.toggleTheme = toggleTheme;

// Apply stored theme on script load (flash-prevention script already set the attribute, but update the button)
updateThemeToggle(getTheme());

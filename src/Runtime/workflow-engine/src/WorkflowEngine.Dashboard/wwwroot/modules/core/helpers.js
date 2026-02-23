/* Generic helpers + JSON utilities */

/** @param {string} s */
export const cssId = (s) => s.replace(/[^a-zA-Z0-9-_]/g, '_');

/** @param {string} s */
export const esc = (s) => {
  if (!s) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
};

/** @param {string} s */
export const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** @param {number} seconds */
export const formatElapsed = (seconds) => {
  if (seconds < 60)   return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

/* ── Timestamp formatting & UTC toggle ─────────────────────────────────── */

/** @returns {boolean} */
export const showTimestamps = () => localStorage.getItem('showTimestamps') !== 'false';

/** @param {boolean} on */
export const setShowTimestamps = (on) => {
  localStorage.setItem('showTimestamps', on ? 'true' : 'false');
  document.body.classList.toggle('hide-timestamps', !on);
};

/** @returns {boolean} */
export const isUtcMode = () => localStorage.getItem('timestampUtc') === 'true';

export const toggleUtcMode = () => {
  localStorage.setItem('timestampUtc', isUtcMode() ? 'false' : 'true');
  refreshTimestamps();
};

/**
 * Format an ISO timestamp to locale-friendly string, respecting UTC preference.
 * @param {string|null|undefined} v
 * @returns {string|null}
 */
export const fmtTime = (v) => {
  if (!v) return null;
  try {
    const d = new Date(v);
    const utc = isUtcMode();
    /** @type {Intl.DateTimeFormatOptions} */
    const opts = { dateStyle: 'short', timeStyle: 'medium' };
    if (utc) opts.timeZone = 'UTC';
    const s = d.toLocaleString(undefined, opts);
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return utc ? `${s}.${ms} UTC` : `${s}.${ms}`;
  } catch { return v; }
};

/** Re-render all visible timestamps from their data-iso attribute. */
export const refreshTimestamps = () => {
  for (const el of document.querySelectorAll('[data-iso]')) {
    const iso = el.getAttribute('data-iso');
    if (iso) el.textContent = fmtTime(iso) || '';
  }
};

/* ── JSON utilities (expand embedded JSON strings + syntax highlighting) ── */

/**
 * @param {unknown} obj
 * @returns {unknown}
 */
export const expandJsonStrings = (obj) => {
  if (typeof obj === 'string') {
    const t = obj.trim();
    if ((t[0] === '{' && t.at(-1) === '}') || (t[0] === '[' && t.at(-1) === ']')) {
      try { return expandJsonStrings(JSON.parse(t)); } catch { /* not valid JSON */ }
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(expandJsonStrings);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, expandJsonStrings(v)])
    );
  }
  return obj;
};

/**
 * @param {unknown} obj
 * @returns {string}
 */
export const syntaxHighlight = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return `<span class="json-key">${escHtml(match.replace(/:$/, ''))}</span>:`;
        }
        cls = 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${escHtml(match)}</span>`;
    }
  );
};

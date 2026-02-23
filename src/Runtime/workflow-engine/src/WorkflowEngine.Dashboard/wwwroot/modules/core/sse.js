/* SSE connection and hot-reload */

import { dom } from './state.js';

/* ── SSE connection ──────────────────────────────────────── */

let disconnectTimer = 0;

/**
 * @param {string} url
 * @param {(data: unknown) => void} onMessage
 * @param {{ showStatus?: boolean, onConnect?: () => void }} [opts]
 */
export const connectSSE = (url, onMessage, opts) => {
  const es = new EventSource(url);
  const showStatus = opts?.showStatus ?? false;
  const onConnect = opts?.onConnect;

  if (showStatus) {
    es.onopen = () => {
      clearTimeout(disconnectTimer);
      dom.sseDot.className = 'sse-dot connected';
      dom.engineStatusLabel.className = 'engine-status-label';
      if (onConnect) onConnect();
    };
  }

  es.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); }
    catch (err) { console.error('SSE parse error:', err); }
  };

  es.onerror = () => {
    if (showStatus) {
      dom.sseDot.className = 'sse-dot disconnected';
      dom.engineIcon.setAttribute('class', 'engine-icon stopped');
      dom.engineIcon.setAttribute('title', 'Disconnected');
      clearTimeout(disconnectTimer);
      disconnectTimer = setTimeout(() => {
        dom.engineStatusLabel.className = 'engine-status-label visible';
      }, 1000);
    }
    es.close();
    setTimeout(() => connectSSE(url, onMessage, opts), 2000);
  };
};

/* ── Hot-reload (SSE from dashboard server on file change) ── */

let hotReloadConnectedOnce = false;
let hotReloadDisabled = false;

export const watchForChanges = () => {
  if (hotReloadDisabled) return;
  const es = new EventSource('/api/hot-reload');
  es.onopen = () => {
    if (hotReloadConnectedOnce) {
      es.close();
      location.reload();
      return;
    }
    hotReloadConnectedOnce = true;
  };
  es.onmessage = () => location.reload();
  es.onerror = () => {
    es.close();
    if (!hotReloadConnectedOnce) {
      hotReloadDisabled = true;
      return;
    }
    setTimeout(watchForChanges, 2000);
  };
};

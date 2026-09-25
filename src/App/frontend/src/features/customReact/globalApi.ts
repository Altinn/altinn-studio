import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';

import { CUSTOM_REACT_API_VERSION, registerComponent } from 'src/features/customReact/registry';
import type { AltinnAppFrontendApi } from 'src/features/customReact/types';

export const GLOBAL_API_READY_EVENT = 'altinnAppFrontendReady';

const api: AltinnAppFrontendApi = Object.freeze({
  apiVersion: CUSTOM_REACT_API_VERSION,
  React,
  jsxRuntime,
  registerComponent,
});

/**
 * Exposes the public API for app scripts as window.altinnAppFrontend, and dispatches an event on window when it
 * becomes available. In production, the app frontend is a classic script that runs before the app's own scripts,
 * so these can use window.altinnAppFrontend directly. In development (Vite dev server), the app frontend loads
 * asynchronously, so app scripts that may run first should wait for the event.
 *
 * The property is read-only and cannot be redefined, so that other scripts cannot replace the API.
 */
export function installGlobalApi() {
  if (window.altinnAppFrontend === api) {
    return;
  }

  Object.defineProperty(window, 'altinnAppFrontend', {
    value: api,
    writable: false,
    configurable: false,
    enumerable: true,
  });
  window.dispatchEvent(new CustomEvent(GLOBAL_API_READY_EVENT, { detail: api }));
}

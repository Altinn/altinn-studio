import * as React from 'react';

import * as Designsystemet from '@digdir/designsystemet-react';

import { GLOBAL_API_READY_EVENT, installGlobalApi } from 'src/features/customReact/globalApi';
import { registerComponent } from 'src/features/customReact/registry';

describe('installGlobalApi', () => {
  it('exposes a frozen, read-only API on window and announces it', () => {
    const listener = vi.fn();
    window.addEventListener(GLOBAL_API_READY_EVENT, listener);

    installGlobalApi();

    const api = window.altinnAppFrontend!;
    expect(api.apiVersion).toBe(1);
    expect(api.React).toBe(React);
    expect(api.Designsystemet).toBe(Designsystemet);
    expect(api.Designsystemet.Button).toBeDefined();
    expect(api.registerComponent).toBe(registerComponent);
    expect(Object.keys(api).sort()).toEqual([
      'Designsystemet',
      'React',
      'apiVersion',
      'jsxRuntime',
      'registerComponent',
    ]);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: api }));

    expect(Object.isFrozen(api)).toBe(true);
    // Modules run in strict mode, so assigning to a read-only property throws
    expect(() => {
      (window as unknown as Record<string, unknown>).altinnAppFrontend = {};
    }).toThrow(TypeError);
    expect(() => Object.defineProperty(window, 'altinnAppFrontend', { value: {} })).toThrow(TypeError);
    expect(window.altinnAppFrontend).toBe(api);

    // Installing again (e.g. on hot reload) keeps the same API and does not throw
    expect(() => installGlobalApi()).not.toThrow();
    expect(window.altinnAppFrontend).toBe(api);

    window.removeEventListener(GLOBAL_API_READY_EVENT, listener);
  });
});

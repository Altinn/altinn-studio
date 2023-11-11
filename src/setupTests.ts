import 'jest';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';
import 'core-js/stable/structured-clone'; // https://github.com/jsdom/jsdom/issues/3363

import { TextDecoder, TextEncoder } from 'util';

// https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

Object.defineProperty(document, 'fonts', {
  value: { ready: Promise.resolve({}) },
});

// Forcing a low timeout for useDelayedSaveState()
(global as any).delayedSaveState = 50;

// org and app is assigned to window object, so to avoid 'undefined' in tests, they need to be set
window.org = 'ttd';
window.app = 'test';
window.instanceId = 'test-instance-id';
window.logError = jest.fn();
window.logWarn = jest.fn();
window.logInfo = jest.fn();
window.logErrorOnce = jest.fn();
window.logWarnOnce = jest.fn();
window.logInfoOnce = jest.fn();
jest.setTimeout(15000);

jest.mock('axios');

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

(async () => {
  // These need to run after TextEncoder and TextDecoder has been set above, because we can't start importing our code
  // before these are present. We also need to set up the store at least once first, so that saga slice actions have
  // been assigned.

  const setupStore = (await import('src/redux/store')).setupStore;
  const initSagas = (await import('src/redux/sagas')).initSagas;

  const { sagaMiddleware } = setupStore();
  initSagas(sagaMiddleware);
})();

global.ResizeObserver = require('resize-observer-polyfill');

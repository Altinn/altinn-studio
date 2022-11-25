import 'jest';
import '@testing-library/jest-dom/extend-expect';
import 'whatwg-fetch';

import failOnConsole from 'jest-fail-on-console';

failOnConsole({
  shouldFailOnWarn: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

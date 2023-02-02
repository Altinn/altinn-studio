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

// ResizeObserver must be mocked because it is used by the Popover component from the design system, but it is not supported by React Testing Library.
class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
window.ResizeObserver = ResizeObserver;

jest.setTimeout(30000);

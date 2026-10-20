import '@testing-library/jest-dom/vitest';
import '@oddbird/popover-polyfill';
import { configure } from '@testing-library/dom';
import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'crypto';
import failOnConsole from 'vitest-fail-on-console';
import { vi } from 'vitest';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ComponentType } from 'react';

// DOM Testing Library currently detects fake timers through the Jest-compatible global name.
// Point it at Vitest so waitFor advances vi.useFakeTimers() instead of waiting indefinitely.
Object.assign(globalThis, { jest: vi });

// Browser APIs that jsdom lacks.
// Newer jsdom versions hide [popover] elements but have no Popover API, so the polyfill's open state never shows them:
// https://github.com/jsdom/jsdom/issues/3721
const popoverStyle = document.createElement('style');
popoverStyle.textContent = '[popover].\\:popover-open { display: block !important; }';
document.head.appendChild(popoverStyle);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// polyfill for jsdom (taken from https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest)
Object.assign(global, { TextDecoder, TextEncoder });

// ResizeObserver must be mocked because it is used by the Popover component from the design system, but it is not supported by React Testing Library.
class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserver;

// document.getAnimations must be mocked because it is used by the design system, but it is not supported by React Testing Library.
Object.defineProperty(document, 'getAnimations', {
  value: () => [],
  writable: true,
});

// document.elementFromPoint must be mocked because the Popover component from the design system uses
// it to check whether it is the top layer, but jsdom has no layout, so every element reports a
// zero-sized rect. Returning the open popover lets the Escape key reach it.
Object.defineProperty(document, 'elementFromPoint', {
  value: () =>
    Array.from(document.querySelectorAll<HTMLElement>('[popover]')).findLast(
      (element) => element.matches(':popover-open') || element.classList.contains(':popover-open'),
    ) ?? document.body,
  writable: true,
});

// Use Node's implementation of Web Crypto API, since jsdom does not have access to browser's Web Crypto API
Object.defineProperty(window, 'crypto', {
  value: webcrypto,
  writable: true,
});

// Workaround for the known issue. For more info, see this: https://github.com/jsdom/jsdom/issues/3294#issuecomment-1268330372
HTMLDialogElement.prototype.showModal = vi.fn(function mock(this: HTMLDialogElement) {
  this.open = true;
});
HTMLDialogElement.prototype.close = vi.fn(function mock(this: HTMLDialogElement) {
  if (this.open) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  }
});

const TESTING_LIBRARY_TIMEOUT_MILLISECONDS = 2000;

configure({ asyncUtilTimeout: TESTING_LIBRARY_TIMEOUT_MILLISECONDS });

failOnConsole({
  shouldFailOnWarn: true,
  silenceMessage(message) {
    // TODO: remove when we no longer are using forwardRef from react (it was deprecated in React 19)
    return (
      'Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.' ===
      message
    );
  },
});

// I18next mocks. The useTranslation and Trans mocks apply the textMock function on the text key, so that it can be used to address the texts in the tests.
vi.mock('i18next', async () => {
  const { textMock } = await import('./mocks/i18nMock');
  return {
    use: () => ({ init: vi.fn() }),
    t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
  };
});

type ComponentWithTranslationProps = {
  t: (key: string, variables?: KeyValuePairs<string>) => string;
};
vi.mock('react-i18next', async () => {
  const { textMock } = await import('./mocks/i18nMock');
  const { createElement } = await import('react');
  return {
    Trans: ({ i18nKey }) => textMock(i18nKey),
    useTranslation: () => ({
      t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
      i18n: {
        exists: () => true,
        language: 'nb',
      },
    }),
    withTranslation:
      () =>
      <P extends object>(Component: ComponentType<P & ComponentWithTranslationProps>) => {
        const WithTranslationMock = (props: P) =>
          createElement(Component, {
            ...props,
            t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
          });
        return WithTranslationMock;
      },
  };
});

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useBlocker: vi.fn().mockReturnValue({ state: 'idle' }),
  useBeforeUnload: vi.fn(),
}));

// SignalR is mocked, so that tests do not open a real connection.
vi.mock('@microsoft/signalr', async () => ({
  ...(await vi.importActual('@microsoft/signalr')),
  ...(await import('./mocks/signalr')).SignalR,
}));

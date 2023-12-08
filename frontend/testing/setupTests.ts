import 'jest';
import 'whatwg-fetch';
import '@testing-library/jest-dom/jest-globals';
import '@testing-library/jest-dom';

import failOnConsole from 'jest-fail-on-console';
import { textMock } from './mocks/i18nMock';
import { SignalR } from './mocks/signalr';
import { ReactNode } from 'react';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

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

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// ResizeObserver must be mocked because it is used by the Popover component from the design system, but it is not supported by React Testing Library.
class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
window.ResizeObserver = ResizeObserver;

// Workaround for the known issue. For more info, see this: https://github.com/jsdom/jsdom/issues/3294#issuecomment-1268330372
HTMLDialogElement.prototype.showModal = jest.fn(function mock(this: HTMLDialogElement) {
  this.open = true;
});
HTMLDialogElement.prototype.close = jest.fn(function mock(this: HTMLDialogElement) {
  this.open = false;
});

// I18next mocks. The useTranslation and Trans mocks apply the textMock function on the text key, so that it can be used to address the texts in the tests.
jest.mock('i18next', () => ({ use: () => ({ init: jest.fn() }) }));
jest.mock('react-i18next', () => ({
  Trans: ({ i18nKey }) => textMock(i18nKey),
  useTranslation: () => ({
    t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
  }),
  withTranslation: () => (Component: ReactNode) => Component,
}));

// SignalR PreviewHub mock to simulate setup of websockets.
jest.mock('@microsoft/signalr', () => SignalR);

// Mock org and app params
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org: 'org', app: 'app' }),
}));

jest.setTimeout(3000000);

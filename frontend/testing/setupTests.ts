import 'jest';
import 'whatwg-fetch';
import '@testing-library/jest-dom/jest-globals';
import '@testing-library/jest-dom';
import failOnConsole from 'jest-fail-on-console';
import { textMock } from './mocks/i18nMock';
import { SignalR } from './mocks/signalr';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { app, org } from './testids';
import type { WithTranslationProps } from 'react-i18next';
import { configure } from '@testing-library/dom';

failOnConsole({
  shouldFailOnWarn: true,
  silenceMessage(message) {
    return /React Router Future Flag Warning/.test(message); // TODO: remove when react router has been updated to v7
  },
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

// document.getAnimations must be mocked because it is used by the design system, but it is not supported by React Testing Library.
Object.defineProperty(document, 'getAnimations', {
  value: () => [],
  writable: true,
});

// Workaround for the known issue. For more info, see this: https://github.com/jsdom/jsdom/issues/3294#issuecomment-1268330372
HTMLDialogElement.prototype.showModal = jest.fn(function mock(this: HTMLDialogElement) {
  this.open = true;
});
HTMLDialogElement.prototype.close = jest.fn(function mock(this: HTMLDialogElement) {
  this.open = false;
});

// I18next mocks. The useTranslation and Trans mocks apply the textMock function on the text key, so that it can be used to address the texts in the tests.
jest.mock('i18next', () => ({
  use: () => ({ init: jest.fn() }),
  t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
}));

jest.mock('react-i18next', () => ({
  Trans: ({ i18nKey }) => textMock(i18nKey),
  useTranslation: () => ({
    t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
    i18n: {
      exists: () => true,
    },
  }),
  withTranslation:
    () =>
    (
      Component: React.ComponentType,
    ): React.ComponentType<React.ComponentProps<any> & WithTranslationProps> => {
      Component.defaultProps = {
        ...Component.defaultProps,
        t: (key: string, variables?) => textMock(key, variables),
      };
      return Component;
    },
}));

// Mocked SignalR to be able to test in within the tests.
jest.mock('@microsoft/signalr', () => ({
  ...jest.requireActual('@microsoft/signalr'),
  ...SignalR,
}));

// Mock org and app params
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org, app }),
}));

jest.setTimeout(3000000);

const TESTING_LIBRARY_TIMEOUT_MILLISECONDS = 2000;

configure({ asyncUtilTimeout: TESTING_LIBRARY_TIMEOUT_MILLISECONDS });

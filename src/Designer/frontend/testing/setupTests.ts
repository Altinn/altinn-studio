import 'jest';
import '@testing-library/jest-dom/jest-globals';
import '@testing-library/jest-dom';
import './setupEnvironment';
import failOnConsole from 'jest-fail-on-console';
import { textMock } from './mocks/i18nMock';
import { SignalR } from './mocks/signalr';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { createElement, type ComponentType } from 'react';

failOnConsole({
  shouldFailOnWarn: true,
  silenceMessage(message) {
    if (
      // TODO: remove when we no longer are using forwardRef from react (it was deprecated in React 19)
      'Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.' ===
      message
    ) {
      return true;
    }

    return false;
  },
});

// I18next mocks. The useTranslation and Trans mocks apply the textMock function on the text key, so that it can be used to address the texts in the tests.
jest.mock('i18next', () => ({
  use: () => ({ init: jest.fn() }),
  t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
}));

type ComponentWithTranslationProps = {
  t: (key: string, variables?: KeyValuePairs<string>) => string;
};
jest.mock('react-i18next', () => ({
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
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useBlocker: jest.fn().mockReturnValue({ state: 'idle' }),
  useBeforeUnload: jest.fn(),
}));

// Mocked SignalR to be able to test in within the tests.
jest.mock('@microsoft/signalr', () => ({
  ...jest.requireActual('@microsoft/signalr'),
  ...SignalR,
}));

jest.setTimeout(3000000);

// First, because setupEnvironment.ts calls jest.fn when it is imported.
import './vitestJestShim';
import '@testing-library/jest-dom/vitest';
import './setupEnvironment';
import failOnConsole from 'vitest-fail-on-console';
import { vi } from 'vitest';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ComponentType } from 'react';

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

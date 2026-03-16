import React from 'react';
import { render, screen } from '@testing-library/react';
import { HeaderContextProvider, useHeaderContext } from './HeaderContext';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockEnvironment = { environment: null, isLoading: false, error: null };

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

const UserSettingsLinkConsumer = () => {
  const { profileMenuGroups } = useHeaderContext();
  const allItems = profileMenuGroups?.flatMap((group) => group.items) ?? [];
  const userSettingsItem = allItems.find((item) => item.itemName === textMock('user.settings'));
  const href = userSettingsItem?.action.type === 'link' ? userSettingsItem.action.href : null;
  return <div data-testid='user-settings-href'>{href ?? 'none'}</div>;
};

const renderHeaderContext = () =>
  renderWithProviders(
    <HeaderContextProvider>
      <UserSettingsLinkConsumer />
    </HeaderContextProvider>,
  );

describe('HeaderContext', () => {
  it('should render children', () => {
    renderWithProviders(
      <HeaderContextProvider>
        <button>My button</button>
      </HeaderContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useHeaderContext hook', () => {
    const TestComponent = () => {
      const {} = useHeaderContext();
      return <div data-testid='context'></div>;
    };

    renderWithProviders(
      <HeaderContextProvider>
        <TestComponent />
      </HeaderContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useHeaderContext is used outside of a HeaderContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useHeaderContext must be used within a HeaderContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it('should include user settings link in profile menu when studioOidc feature flag is enabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };

    renderHeaderContext();

    expect(screen.getByTestId('user-settings-href')).not.toHaveTextContent('none');
  });

  it('should not include user settings link in profile menu when studioOidc feature flag is disabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderHeaderContext();

    expect(screen.getByTestId('user-settings-href')).toHaveTextContent('none');
  });
});

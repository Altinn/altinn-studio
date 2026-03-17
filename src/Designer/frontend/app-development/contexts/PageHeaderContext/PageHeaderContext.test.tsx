import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageHeaderContextProvider, usePageHeaderContext } from './PageHeaderContext';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockEnvironment = { environment: null, isLoading: false, error: null };

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

const UserSettingsLinkConsumer = () => {
  const { profileMenuGroups } = usePageHeaderContext();
  const allItems = profileMenuGroups?.flatMap((group) => group.items) ?? [];
  const userSettingsItem = allItems.find((item) => item.itemName === textMock('user.settings'));
  const href = userSettingsItem?.action.type === 'link' ? userSettingsItem.action.href : null;
  return <div data-testid='user-settings-href'>{href ?? 'none'}</div>;
};

const renderPageHeaderContext = () =>
  renderWithProviders()(
    <PageHeaderContextProvider>
      <UserSettingsLinkConsumer />
    </PageHeaderContextProvider>,
  );

describe('PageHeaderContext', () => {
  it('should render children', () => {
    renderWithProviders()(
      <PageHeaderContextProvider>
        <button>My button</button>
      </PageHeaderContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a usePageHeaderContext hook', () => {
    const TestComponent = () => {
      const {} = usePageHeaderContext();
      return <div data-testid='context'></div>;
    };

    renderWithProviders()(
      <PageHeaderContextProvider>
        <TestComponent />
      </PageHeaderContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when usePageHeaderContext is used outside of a PageHeaderContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      usePageHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'usePageHeaderContext must be used within a PageHeaderContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it('should include user settings link in profile menu when studioOidc feature flag is enabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };

    renderPageHeaderContext();

    expect(screen.getByTestId('user-settings-href')).not.toHaveTextContent('none');
  });

  it('should not include user settings link in profile menu when studioOidc feature flag is disabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderPageHeaderContext();

    expect(screen.getByTestId('user-settings-href')).toHaveTextContent('none');
  });
});

import { render, screen } from '@testing-library/react';
import { PageHeaderContextProvider, usePageHeaderContext } from './PageHeaderContext';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const SettingsLinkConsumer = () => {
  const { profileMenuGroups } = usePageHeaderContext();
  const allItems = profileMenuGroups?.flatMap((group) => group.items) ?? [];
  const settingsItem = allItems.find((item) => item.itemName === textMock('settings'));
  const href = settingsItem?.action.type === 'link' ? settingsItem.action.href : null;
  return <div data-testid='settings-href'>{href ?? 'none'}</div>;
};

const renderPageHeaderContext = () =>
  renderWithProviders()(
    <PageHeaderContextProvider>
      <SettingsLinkConsumer />
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
    const TestComponent = () => {
      usePageHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'usePageHeaderContext must be used within a PageHeaderContextProvider',
    );
  });

  it('should include user settings link in profile menu', () => {
    renderPageHeaderContext();

    expect(screen.getByTestId('settings-href')).not.toHaveTextContent('none');
  });

});

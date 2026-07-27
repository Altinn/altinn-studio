import { render, screen } from '@testing-library/react';
import { HeaderContextProvider, useHeaderContext } from './HeaderContext';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const SettingsLinkConsumer = () => {
  const { profileMenuGroups } = useHeaderContext();
  const allItems = profileMenuGroups?.flatMap((group) => group.items) ?? [];
  const settingsItem = allItems.find((item) => item.itemName === textMock('settings'));
  const href = settingsItem?.action.type === 'link' ? settingsItem.action.href : null;
  return <div data-testid='settings-href'>{href ?? 'none'}</div>;
};

const renderHeaderContext = (options?: Parameters<typeof renderWithProviders>[1]) =>
  renderWithProviders(
    <HeaderContextProvider>
      <SettingsLinkConsumer />
    </HeaderContextProvider>,
    options,
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
    const TestComponent = () => {
      useHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useHeaderContext must be used within a HeaderContextProvider',
    );
  });

  it('should include user settings link in profile menu', () => {
    renderHeaderContext();

    expect(screen.getByTestId('settings-href')).not.toHaveTextContent(/^none$/);
  });
});

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPageButton } from './SettingsPageButton';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AppDevelopmentContextProvider } from 'app-development/contexts/AppDevelopmentContext';
import { useMediaQuery } from '@studio/components-legacy';
import { renderWithProviders } from 'app-development/test/mocks';
import { pageHeaderContextMock } from 'app-development/test/headerMocks';
import { PageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { typedLocalStorage } from '@studio/pure-functions';
import { useNavigateFrom } from './useNavigateFrom';

jest.mock('@studio/components-legacy/src/hooks/useMediaQuery');

jest.mock('./useNavigateFrom.ts', () => ({
  ...jest.requireActual('./useNavigateFrom.ts'),
  useNavigateFrom: jest.fn().mockImplementation(() => ({
    navigateFrom: '',
    currentRoutePath: '',
  })),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('SettingsPageButton', () => {
  const user = userEvent.setup();
  afterEach(() => {
    typedLocalStorage.removeItem('featureFlags');
    jest.clearAllMocks();
  });

  it('should render the button with text on a large screen', () => {
    renderSettingsPageButton();

    expect(screen.getByText(textMock('sync_header.settings'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.settings') }),
    ).toBeInTheDocument();
  });

  it('should not render the button text on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    renderSettingsPageButton();

    expect(screen.queryByText(textMock('sync_header.settings'))).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.settings') }),
    ).toBeInTheDocument();
  });

  it('renders back icon and button text when on settings page and feature is enabled', () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useNavigateFrom as jest.Mock).mockReturnValue({
      currentRoutePath: RoutePaths.AppSettings,
      navigateFrom: RoutePaths.UIEditor,
    });
    renderSettingsPageButton();

    const goBackButton = screen.getByRole('button', {
      name: textMock('sync_header.settings_back_to_ui-editor'),
    });
    expect(goBackButton).toBeInTheDocument();
  });

  it('navigates to settings page when clicking the settings button', async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useNavigateFrom as jest.Mock).mockReturnValue({
      currentRoutePath: RoutePaths.UIEditor,
      navigateFrom: RoutePaths.UIEditor,
    });
    renderSettingsPageButton();

    const settingsButton = screen.getByRole('button', { name: textMock('sync_header.settings') });
    await user.click(settingsButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      {
        pathname: RoutePaths.AppSettings,
        search: 'currentTab=about',
      },
      {
        state: { from: RoutePaths.UIEditor },
      },
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates back from the settings page when clicking the go back button', async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useNavigateFrom as jest.Mock).mockReturnValue({
      currentRoutePath: RoutePaths.AppSettings,
      navigateFrom: RoutePaths.UIEditor,
    });
    renderSettingsPageButton();

    const goBackButton = screen.getByRole('button', {
      name: textMock('sync_header.settings_back_to_ui-editor'),
    });
    await user.click(goBackButton);

    expect(mockNavigate).toHaveBeenCalledWith(RoutePaths.UIEditor);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates to "overview" page when clicking go back and on settings page and from is null', async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useNavigateFrom as jest.Mock).mockReturnValue({
      currentRoutePath: RoutePaths.AppSettings,
      navigateFrom: null,
    });
    renderSettingsPageButton();

    const goBackButton = screen.getByRole('button', {
      name: textMock('sync_header.settings_back_to_overview'),
    });
    await user.click(goBackButton);

    expect(mockNavigate).toHaveBeenCalledWith(RoutePaths.Overview);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

const renderSettingsPageButton = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders()(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <AppDevelopmentContextProvider>
        <PageHeaderContext.Provider value={{ ...pageHeaderContextMock }}>
          <SettingsPageButton />
        </PageHeaderContext.Provider>
      </AppDevelopmentContextProvider>
    </ServicesContextProvider>,
  );
};

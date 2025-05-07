import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModalButton } from './SettingsModalButton';
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
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { typedLocalStorage } from '@studio/pure-functions';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';

jest.mock('@studio/components-legacy/src/hooks/useMediaQuery');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn().mockImplementation(() => ({
    pathname: '',
    state: { from: '' },
  })),
}));

describe('SettingsModal', () => {
  const user = userEvent.setup();
  afterEach(() => {
    typedLocalStorage.removeItem('featureFlags');
    jest.clearAllMocks();
  });

  it('has SettingsModal default to closed', async () => {
    renderSettingsModalButton();

    const modalHeading = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 2,
    });

    expect(modalHeading).not.toBeInTheDocument();
  });

  it('opens the SettingsModal when the button is clicked', async () => {
    renderSettingsModalButton();

    const modalHeading = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 2,
    });
    expect(modalHeading).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: textMock('sync_header.settings') });
    await user.click(button);

    const modalHeadingAfter = screen.getByRole('heading', {
      name: textMock('settings_modal.heading'),
    });
    expect(modalHeadingAfter).toBeInTheDocument();
  });

  it('closes the SettingsModal when the modal is closed', async () => {
    renderSettingsModalButton();
    const button = screen.getByRole('button', { name: textMock('sync_header.settings') });
    await user.click(button);

    const modalHeading = screen.getByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 2,
    });
    expect(modalHeading).toBeInTheDocument();

    const closeButton = screen.getByRole('button', {
      name: 'close modal', // Todo: Replace with textMock('settings_modal.close_button_label') when https://github.com/digdir/designsystemet/issues/2195 is fixed
    });
    await user.click(closeButton);

    const modalHeadingAfter = screen.queryByRole('heading', {
      name: textMock('settings_modal.heading'),
      level: 2,
    });
    expect(modalHeadingAfter).not.toBeInTheDocument();
  });

  it('should render the button with text on a large screen', () => {
    renderSettingsModalButton();

    expect(screen.getByText(textMock('sync_header.settings'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.settings') }),
    ).toBeInTheDocument();
  });

  it('should not render the button text on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    renderSettingsModalButton();

    expect(screen.queryByText(textMock('sync_header.settings'))).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.settings') }),
    ).toBeInTheDocument();
  });

  it('renders back icon and button text when on settings page and feature is enabled', () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useLocation as jest.Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: { from: RoutePaths.UIEditor },
    });

    addFeatureFlagToLocalStorage(FeatureFlag.SettingsPage);
    renderSettingsModalButton();

    const goBackButton = screen.getByRole('button', {
      name: textMock('sync_header.settings_back_to_ui-editor'),
    });
    expect(goBackButton).toBeInTheDocument();
  });

  it('navigates to settings page when clicking the settings button', async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useLocation as jest.Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.UIEditor}`,
      state: { from: RoutePaths.UIEditor },
    });

    addFeatureFlagToLocalStorage(FeatureFlag.SettingsPage);
    renderSettingsModalButton();

    const settingsButton = screen.getByRole('button', { name: textMock('sync_header.settings') });
    await user.click(settingsButton);

    expect(mockNavigate).toHaveBeenCalledWith(RoutePaths.AppSettings, {
      state: { from: RoutePaths.UIEditor },
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates back from the settings page when clicking the go back button', async () => {
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useLocation as jest.Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: { from: RoutePaths.UIEditor },
    });

    addFeatureFlagToLocalStorage(FeatureFlag.SettingsPage);
    renderSettingsModalButton();

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
    (useLocation as jest.Mock).mockReturnValue({
      pathname: `/org/app/${RoutePaths.AppSettings}`,
      state: { from: null },
    });

    addFeatureFlagToLocalStorage(FeatureFlag.SettingsPage);
    renderSettingsModalButton();

    const goBackButton = screen.getByRole('button', {
      name: textMock('sync_header.settings_back_to_overview'),
    });
    await user.click(goBackButton);

    expect(mockNavigate).toHaveBeenCalledWith(RoutePaths.Overview);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

const renderSettingsModalButton = (
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
          <SettingsModalButton />
        </PageHeaderContext.Provider>
      </AppDevelopmentContextProvider>
    </ServicesContextProvider>,
  );
};

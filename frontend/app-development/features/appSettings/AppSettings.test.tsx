import React from 'react';
import { screen } from '@testing-library/react';
import { AppSettings } from './AppSettings';
import { renderWithProviders } from 'app-development/test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { useSearchParams } from 'react-router-dom';
import { settingsPageQueryParamKey } from './utils';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: jest.fn(),
}));

describe('AppSettings', () => {
  afterEach(jest.clearAllMocks);

  it('renders the settings heading', () => {
    renderAppSettings();
    expect(getHeading(textMock('app_settings.heading'), 2)).toBeInTheDocument();
  });

  it('renders the current tab from query param', () => {
    const currentTab: SettingsPageTabId = 'about';
    const searchParams = buildSearchParams(currentTab);
    setupSearchParamMock(searchParams);

    renderAppSettings();
    expect(getHeading(textMock(`app_settings.${currentTab}_tab_heading`), 3)).toBeInTheDocument();
  });

  it('defaults to about tab if an invalid tab is selected', () => {
    const invalidTab: SettingsPageTabId = 'invalid' as SettingsPageTabId;
    const searchParams = buildSearchParams(invalidTab);
    setupSearchParamMock(searchParams);
    renderAppSettings();

    const aboutTabId: SettingsPageTabId = 'about';
    expect(getHeading(textMock(`app_settings.${aboutTabId}_tab_heading`), 3)).toBeInTheDocument();
  });

  it('navigates to selected tab when valid tab is clicked', async () => {
    const user = userEvent.setup();
    const currentTab: SettingsPageTabId = 'about';
    const searchParams = buildSearchParams(currentTab);
    setupSearchParamMock(searchParams);
    renderAppSettings();

    const policyTabId: SettingsPageTabId = 'policy';
    const policyTab = screen.getByRole('tab', {
      name: textMock(`app_settings.left_nav_tab_${policyTabId}`),
    });
    await user.click(policyTab);

    expect(getHeading(textMock(`app_settings.${policyTabId}_tab_heading`), 3)).toBeInTheDocument();
  });
});

const getHeading = (name: string, level?: number): HTMLHeadingElement =>
  screen.getByRole('heading', {
    name,
    level,
  });

const renderAppSettings = () => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(queriesMock, queryClient)(<AppSettings />);
};

function setupSearchParamMock(searchParams: URLSearchParams): jest.Mock {
  return (useSearchParams as jest.Mock).mockReturnValue([searchParams, jest.fn()]);
}

function buildSearchParams(queryParamValue: string): URLSearchParams {
  const searchParams: URLSearchParams = new URLSearchParams();
  searchParams.set(settingsPageQueryParamKey, queryParamValue);
  return searchParams;
}

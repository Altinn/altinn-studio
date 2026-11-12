import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { RunTab } from './RunTab';
import type { AppSettings } from 'app-shared/types/AppSettings';
import userEvent from '@testing-library/user-event';
import { app, org } from '@studio/testing/testids';

const appSettings: AppSettings = {
  undeployOnInactivity: null,
  inactivityPeriodDays: null,
  orgUndeployOnInactivity: true,
  orgInactivityPeriodDays: 30,
};

describe('RunTab', () => {
  it('initially displays spinner when loading data', () => {
    renderRunTab();
    expect(screen.getByText(textMock('app_settings.loading_content'))).toBeInTheDocument();
  });

  it('fetches app settings on mount', async () => {
    const getAppSettings = vi.fn().mockImplementation(() => Promise.resolve(appSettings));

    renderRunTab({ getAppSettings });

    await waitFor(() => expect(getAppSettings).toHaveBeenCalledTimes(1));
  });

  it('shows an error message if an error occurred on the get settings query', async () => {
    const errorMessage = 'error-message-test';

    await resolveAndWaitForSpinnerToDisappear({
      getAppSettings: () => Promise.reject({ message: errorMessage }),
    });

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders the inactivity undeploy settings when they are fetched', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getAppSettings: () => Promise.resolve(appSettings),
    });

    expect(getInheritOnRadio()).toBeChecked();
  });

  it('saves the settings through the app settings mutation', async () => {
    const user = userEvent.setup();
    const updateAppSettings = vi.fn().mockImplementation(() => Promise.resolve());

    await resolveAndWaitForSpinnerToDisappear({
      getAppSettings: () => Promise.resolve(appSettings),
      getDeployPermissions: () => Promise.resolve(['at23']),
      updateAppSettings,
    });

    const offRadio = screen.getByRole('radio', {
      name: textMock('app_settings.run_tab_undeploy_off'),
    });
    await waitFor(() => expect(offRadio).toBeEnabled());
    await user.click(offRadio);
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));

    expect(updateAppSettings).toHaveBeenCalledTimes(1);
    expect(updateAppSettings).toHaveBeenCalledWith(org, app, {
      undeployOnInactivity: false,
      inactivityPeriodDays: null,
    });
  });

  it('disables editing when the user lacks deploy permission', async () => {
    const getDeployPermissions = vi.fn().mockImplementation(() => Promise.resolve([]));
    await resolveAndWaitForSpinnerToDisappear({
      getAppSettings: () => Promise.resolve(appSettings),
      getDeployPermissions,
    });

    await waitFor(() => expect(getDeployPermissions).toHaveBeenCalledTimes(1));
    expect(getInheritOnRadio()).toBeDisabled();
    expect(screen.getByRole('button', { name: textMock('general.save') })).toBeDisabled();
  });
});

const getInheritOnRadio = () =>
  screen.getByRole('radio', { name: textMock('app_settings.run_tab_undeploy_inherit_on') });

const renderRunTab = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<RunTab />);
};

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  renderRunTab(queries);
  await waitForElementToBeRemoved(queryPageSpinner);
};

const queryPageSpinner = () => screen.queryByText(textMock('app_settings.loading_content'));

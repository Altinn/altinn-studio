import React from 'react';
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

describe('RunTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays spinner when loading data', () => {
    renderRunTab();
    expect(screen.getByText(textMock('app_settings.loading_content'))).toBeInTheDocument();
  });

  it('fetches app settings on mount', async () => {
    const getAppSettings = jest.fn().mockImplementation(() =>
      Promise.resolve<AppSettings>({
        undeployOnInactivity: false,
      }),
    );

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

  it('renders undeploy setting with setting-specific info text when settings are fetched', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getAppSettings: () => Promise.resolve({ undeployOnInactivity: true }),
    });

    const infoText = textMock('app_settings.run_tab_info');
    const checkbox = screen.getByLabelText(
      textMock('app_settings.run_tab_switch_undeploy_on_inactivity'),
    );

    expect(screen.getByText(infoText)).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('persists the switch value when toggled', async () => {
    const user = userEvent.setup();
    const updateAppSettings = jest.fn().mockImplementation(() => Promise.resolve());

    await resolveAndWaitForSpinnerToDisappear({
      getAppSettings: () => Promise.resolve({ undeployOnInactivity: false }),
      getDeployPermissions: () => Promise.resolve(['at23']),
      updateAppSettings,
    });

    const checkbox = screen.getByLabelText(
      textMock('app_settings.run_tab_switch_undeploy_on_inactivity'),
    );
    await waitFor(() => expect(checkbox).toBeEnabled());
    await user.click(checkbox);

    expect(updateAppSettings).toHaveBeenCalledTimes(1);
    expect(updateAppSettings).toHaveBeenCalledWith(org, app, { undeployOnInactivity: true });
  });

  it('disables the switch when user lacks deploy permission', async () => {
    const user = userEvent.setup();
    const updateAppSettings = jest.fn().mockImplementation(() => Promise.resolve());

    await resolveAndWaitForSpinnerToDisappear({
      getAppSettings: () => Promise.resolve({ undeployOnInactivity: false }),
      getDeployPermissions: () => Promise.resolve([]),
      updateAppSettings,
    });

    const checkbox = screen.getByLabelText(
      textMock('app_settings.run_tab_switch_undeploy_on_inactivity'),
    );

    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(updateAppSettings).toHaveBeenCalledTimes(0);
  });
});

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

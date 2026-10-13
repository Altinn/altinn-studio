import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { OrgInactivityUndeploySettings } from 'app-shared/types/OrgInactivityUndeploySettings';
import {
  MAX_INACTIVITY_PERIOD_DAYS,
  MIN_INACTIVITY_PERIOD_DAYS,
} from 'app-shared/utils/inactivityPeriodUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../testing/mocks';
import { InactivityUndeploy } from './InactivityUndeploy';

const testOrg = 'ttd';

const defaultSettings: OrgInactivityUndeploySettings = {
  undeployOnInactivity: true,
  inactivityPeriodDays: 30,
};

const periodLimits = { min: MIN_INACTIVITY_PERIOD_DAYS, max: MAX_INACTIVITY_PERIOD_DAYS };

describe('InactivityUndeploy', () => {
  it('renders the loading spinner while data is pending', () => {
    renderInactivityUndeploy();
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('renders the error message when the query fails', async () => {
    const getOrgInactivityUndeploySettings = vi.fn().mockRejectedValue(new Error('Failed'));
    renderInactivityUndeploy({ queries: { getOrgInactivityUndeploySettings } });
    expect(
      await screen.findByText(textMock('settings.orgs.inactivity_undeploy.error')),
    ).toBeInTheDocument();
  });

  it('renders the heading, the note about app overrides and the explanation', () => {
    renderInactivityUndeploy({ settings: defaultSettings });
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.inactivity_undeploy.page_heading'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('settings.orgs.inactivity_undeploy.app_override')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('settings.orgs.inactivity_undeploy.info_activity')),
    ).toBeInTheDocument();
  });

  it.each([true, false])(
    'reflects the setting in the switch when it is %s',
    (undeployOnInactivity) => {
      renderInactivityUndeploy({ settings: { ...defaultSettings, undeployOnInactivity } });
      expect(getSwitch()).toHaveProperty('checked', undeployOnInactivity);
    },
  );

  it('shows the period from the settings', () => {
    renderInactivityUndeploy({ settings: defaultSettings });
    expect(getDaysField()).toHaveValue(defaultSettings.inactivityPeriodDays);
  });

  it('disables the save button when nothing has changed', () => {
    renderInactivityUndeploy({ settings: defaultSettings });
    expect(getSaveButton()).toBeDisabled();
  });

  it('saves the changed settings', async () => {
    const user = userEvent.setup();
    const updateOrgInactivityUndeploySettings = vi.fn().mockResolvedValue(undefined);
    renderInactivityUndeploy({
      settings: defaultSettings,
      queries: { updateOrgInactivityUndeploySettings },
    });

    await user.click(getSwitch());
    await user.clear(getDaysField());
    await user.type(getDaysField(), '90');
    await user.click(getSaveButton());

    expect(updateOrgInactivityUndeploySettings).toHaveBeenCalledTimes(1);
    expect(updateOrgInactivityUndeploySettings).toHaveBeenCalledWith(testOrg, {
      undeployOnInactivity: false,
      inactivityPeriodDays: 90,
    });
  });

  it.each([String(MIN_INACTIVITY_PERIOD_DAYS - 1), String(MAX_INACTIVITY_PERIOD_DAYS + 1), ''])(
    'shows an error and blocks saving when the period is %j',
    async (value) => {
      const user = userEvent.setup();
      renderInactivityUndeploy({ settings: defaultSettings });

      await user.clear(getDaysField());
      if (value) await user.type(getDaysField(), value);

      expect(
        screen.getByText(textMock('settings.orgs.inactivity_undeploy.days_error', periodLimits)),
      ).toBeInTheDocument();
      expect(getSaveButton()).toBeDisabled();
    },
  );

  it('resets the changes when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderInactivityUndeploy({ settings: defaultSettings });

    await user.click(getSwitch());
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));

    expect(getSwitch()).toBeChecked();
    expect(getSaveButton()).toBeDisabled();
  });
});

const getSwitch = () =>
  screen.getByRole('switch', { name: textMock('settings.orgs.inactivity_undeploy.switch_label') });
const getDaysField = () =>
  screen.getByRole('spinbutton', {
    name: textMock('settings.orgs.inactivity_undeploy.days_label'),
  });
const getSaveButton = () => screen.getByRole('button', { name: textMock('general.save') });

type RenderInactivityUndeployOptions = {
  settings?: OrgInactivityUndeploySettings;
  queries?: Partial<ServicesContextProps>;
};

const renderInactivityUndeploy = ({ settings, queries }: RenderInactivityUndeployOptions = {}) => {
  const queryClient = createQueryClientMock();
  if (settings) {
    queryClient.setQueryData([QueryKey.OrgInactivityUndeploySettings, testOrg], settings);
  }
  return renderWithProviders(
    <Routes>
      <Route path=':owner/*' element={<InactivityUndeploy />} />
    </Routes>,
    { queries, queryClient, initialEntries: [`/${testOrg}/inactivity-undeploy`] },
  );
};

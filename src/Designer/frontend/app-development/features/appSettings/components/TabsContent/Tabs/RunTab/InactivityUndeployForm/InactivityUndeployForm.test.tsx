import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AppSettings } from 'app-shared/types/AppSettings';
import {
  MAX_INACTIVITY_PERIOD_DAYS,
  MIN_INACTIVITY_PERIOD_DAYS,
} from 'app-shared/utils/inactivityPeriodUtils';
import { InactivityUndeployForm } from './InactivityUndeployForm';
import type { InactivityUndeployFormProps } from './InactivityUndeployForm';

const orgPeriodDays = 30;

const inheritedSettings: AppSettings = {
  undeployOnInactivity: null,
  inactivityPeriodDays: null,
  orgUndeployOnInactivity: true,
  orgInactivityPeriodDays: orgPeriodDays,
};

const defaultProps: InactivityUndeployFormProps = {
  appSettings: inheritedSettings,
  canEdit: true,
  isSaving: false,
  onSave: vi.fn(),
};

const periodLimits = { min: MIN_INACTIVITY_PERIOD_DAYS, max: MAX_INACTIVITY_PERIOD_DAYS };

describe('InactivityUndeployForm', () => {
  it('selects the inherit options and shows the inherited org values when the app has no own settings', () => {
    renderInactivityUndeployForm();
    expect(getInheritOnRadio()).toBeChecked();
    expect(getPeriodInheritRadio()).toBeChecked();
    expect(queryDaysField()).not.toBeInTheDocument();
  });

  it('shows that the inherited org setting is off when the org has turned it off', () => {
    renderInactivityUndeployForm({
      appSettings: { ...inheritedSettings, orgUndeployOnInactivity: false },
    });
    expect(
      screen.getByRole('radio', { name: textMock('app_settings.run_tab_undeploy_inherit_off') }),
    ).toBeChecked();
  });

  it.each([
    [true, 'app_settings.run_tab_undeploy_on'],
    [false, 'app_settings.run_tab_undeploy_off'],
  ])('selects the matching option when the app setting is %s', (undeployOnInactivity, key) => {
    renderInactivityUndeployForm({
      appSettings: { ...inheritedSettings, undeployOnInactivity },
    });
    expect(screen.getByRole('radio', { name: textMock(key) })).toBeChecked();
  });

  it('shows the custom period when the app overrides the period', () => {
    renderInactivityUndeployForm({
      appSettings: { ...inheritedSettings, inactivityPeriodDays: 14 },
    });
    expect(getPeriodCustomRadio()).toBeChecked();
    expect(queryDaysField()).toHaveValue(14);
  });

  it('disables the save button when nothing has changed', () => {
    renderInactivityUndeployForm();
    expect(getSaveButton()).toBeDisabled();
  });

  it('saves an explicit on value while still inheriting the period', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderInactivityUndeployForm({ onSave });

    await user.click(getOnRadio());
    await user.click(getSaveButton());

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ undeployOnInactivity: true, inactivityPeriodDays: null });
  });

  it('saves an explicit off value with a custom period', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderInactivityUndeployForm({ onSave });

    await user.click(getOffRadio());
    await user.click(getPeriodCustomRadio());
    await user.clear(queryDaysField());
    await user.type(queryDaysField(), '60');
    await user.click(getSaveButton());

    expect(onSave).toHaveBeenCalledWith({ undeployOnInactivity: false, inactivityPeriodDays: 60 });
  });

  it('saves null values when switching an overridden app back to inherit', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderInactivityUndeployForm({
      appSettings: { ...inheritedSettings, undeployOnInactivity: false, inactivityPeriodDays: 90 },
      onSave,
    });

    await user.click(getInheritOnRadio());
    await user.click(getPeriodInheritRadio());
    await user.click(getSaveButton());

    expect(onSave).toHaveBeenCalledWith({ undeployOnInactivity: null, inactivityPeriodDays: null });
  });

  it.each([String(MIN_INACTIVITY_PERIOD_DAYS - 1), String(MAX_INACTIVITY_PERIOD_DAYS + 1), ''])(
    'shows an error and blocks saving when the period is %j',
    async (value) => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      renderInactivityUndeployForm({ onSave });

      await user.click(getPeriodCustomRadio());
      await user.clear(queryDaysField());
      if (value) await user.type(queryDaysField(), value);

      expect(
        screen.getByText(textMock('app_settings.run_tab_period_days_error', periodLimits)),
      ).toBeInTheDocument();
      expect(getSaveButton()).toBeDisabled();
    },
  );

  it('resets the changes when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderInactivityUndeployForm();

    await user.click(getOffRadio());
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));

    expect(getInheritOnRadio()).toBeChecked();
    expect(getSaveButton()).toBeDisabled();
  });

  it('disables all fields and the save button when the user cannot edit', () => {
    renderInactivityUndeployForm({
      canEdit: false,
      appSettings: { ...inheritedSettings, inactivityPeriodDays: 14 },
    });
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    expect(queryDaysField()).toBeDisabled();
    expect(getSaveButton()).toBeDisabled();
  });

  it('shows the explanation of how inactivity is measured', () => {
    renderInactivityUndeployForm();
    expect(
      screen.getByText(textMock('app_settings.run_tab_info_test_environments')),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('app_settings.run_tab_info_activity'))).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_settings.run_tab_info_background_work')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_settings.run_tab_info_publish_again')),
    ).toBeInTheDocument();
  });
});

const getRadio = (key: string, variables?: Record<string, number>) =>
  screen.getByRole('radio', { name: textMock(key, variables) });
const getInheritOnRadio = () => getRadio('app_settings.run_tab_undeploy_inherit_on');
const getOnRadio = () => getRadio('app_settings.run_tab_undeploy_on');
const getOffRadio = () => getRadio('app_settings.run_tab_undeploy_off');
const getPeriodInheritRadio = () =>
  getRadio('app_settings.run_tab_period_inherit', { days: orgPeriodDays });
const getPeriodCustomRadio = () => getRadio('app_settings.run_tab_period_custom');
const queryDaysField = () =>
  screen.queryByRole('spinbutton', { name: textMock('app_settings.run_tab_period_days_label') });
const getSaveButton = () => screen.getByRole('button', { name: textMock('general.save') });

const renderInactivityUndeployForm = (props: Partial<InactivityUndeployFormProps> = {}) =>
  render(<InactivityUndeployForm {...defaultProps} {...props} />);

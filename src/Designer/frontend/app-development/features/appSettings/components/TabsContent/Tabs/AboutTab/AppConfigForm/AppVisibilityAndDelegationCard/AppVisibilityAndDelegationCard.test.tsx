import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  AppVisibilityAndDelegationCard,
  type AppVisibilityAndDelegationCardProps,
} from './AppVisibilityAndDelegationCard';

const defaultDescriptionValue = { nb: '', nn: '', en: '' };

const renderAppVisibilityAndDelegationCard = (
  props: Partial<AppVisibilityAndDelegationCardProps> = {},
) => {
  const defaultProps: AppVisibilityAndDelegationCardProps = {
    visible: false,
    delegable: false,
    descriptionValue: defaultDescriptionValue,
    onChangeVisible: jest.fn(),
    onChangeDelegable: jest.fn(),
    onChangeDescription: jest.fn(),
  };

  return renderWithProviders()(<AppVisibilityAndDelegationCard {...defaultProps} {...props} />);
};

describe('AppVisibilityAndDelegationCard', () => {
  it('shows info message and hides description when app is hidden and not delegable', () => {
    renderAppVisibilityAndDelegationCard({ visible: false, delegable: false });
    expect(
      screen.getByText(
        textMock('app_settings.about_tab_visibility_and_delegation_info_hidden_no_delegation'),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        textMock('app_settings.about_tab_visibility_and_delegation_description_text'),
      ),
    ).not.toBeInTheDocument();
  });

  it('disables second switch and shows description + correct info when visible is true', async () => {
    const user = userEvent.setup();
    const onChangeDelegable = jest.fn();
    renderAppVisibilityAndDelegationCard({
      visible: true,
      delegable: true,
      onChangeDelegable,
    });
    const visibleSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_visible_label'),
    });
    const delegableSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_delegable_label'),
    });
    expect(visibleSwitch).toBeEnabled();
    expect(delegableSwitch).toBeChecked();
    expect(delegableSwitch).toBeDisabled();
    expect(
      screen.getByText(
        textMock('app_settings.about_tab_visibility_and_delegation_info_visible_can_delegate'),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('app_settings.about_tab_visibility_and_delegation_description_text'),
      ),
    ).toBeInTheDocument();
    await user.click(delegableSwitch);
    expect(onChangeDelegable).not.toHaveBeenCalled();
  });

  it('enables second switch and shows warning + description when hidden and delegable', () => {
    const onChangeDelegable = jest.fn();
    renderAppVisibilityAndDelegationCard({
      visible: false,
      delegable: true,
      onChangeDelegable,
    });
    const delegableSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_delegable_label'),
    });
    expect(delegableSwitch).toBeEnabled();
    const warningTexts = screen.getAllByText(
      textMock('app_settings.about_tab_visibility_and_delegation_warning_hidden_delegate_via_api'),
    );
    expect(warningTexts.length).toBeGreaterThan(0);

    expect(
      screen.getByText(
        textMock('app_settings.about_tab_visibility_and_delegation_description_text'),
      ),
    ).toBeInTheDocument();
  });

  it('calls change handlers when switches are toggled', async () => {
    const user = userEvent.setup();
    const onChangeVisible = jest.fn();
    const onChangeDelegable = jest.fn();
    renderAppVisibilityAndDelegationCard({
      visible: false,
      delegable: false,
      onChangeVisible,
      onChangeDelegable,
    });
    const visibleSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_visible_label'),
    });
    const delegableSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_delegable_label'),
    });
    await user.click(visibleSwitch);
    await user.click(delegableSwitch);
    expect(onChangeVisible).toHaveBeenCalledTimes(1);
    expect(onChangeDelegable).toHaveBeenCalledTimes(1);
  });
});

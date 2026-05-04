import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
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

  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppVisibilityAndDelegationCard {...defaultProps} {...props} />
    </MemoryRouter>,
  );
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

  it('switches and texts are rendered correctly when both are toggled off', async () => {
    renderAppVisibilityAndDelegationCard({
      visible: false,
      delegable: false,
    });
    const visibleSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_visible_label'),
    });
    const delegableSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_delegable_label'),
    });
    expect(visibleSwitch).toBeDisabled();
    expect(visibleSwitch).not.toBeChecked();
    expect(delegableSwitch).toBeEnabled();
    expect(delegableSwitch).not.toBeChecked();
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

  it('switches and texts are rendered correctly when both are toggled on', async () => {
    renderAppVisibilityAndDelegationCard({
      visible: true,
      delegable: true,
    });
    const visibleSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_visible_label'),
    });
    const delegableSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_delegable_label'),
    });
    expect(visibleSwitch).toBeEnabled();
    expect(visibleSwitch).toBeChecked();
    expect(delegableSwitch).toBeEnabled();
    expect(delegableSwitch).toBeChecked();
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
  });

  it('should not be possible to toggle visible switch when delegable is false', async () => {
    const user = userEvent.setup();
    const onChangeVisible = jest.fn();
    renderAppVisibilityAndDelegationCard({
      visible: false,
      delegable: false,
      onChangeVisible,
    });
    const visibleSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_visible_label'),
    });

    await user.click(visibleSwitch);
    expect(onChangeVisible).not.toHaveBeenCalled();
  });

  it('should be possible to toggle visible switch when delegable is true', async () => {
    const user = userEvent.setup();
    const onChangeVisible = jest.fn();
    renderAppVisibilityAndDelegationCard({
      visible: false,
      delegable: true,
      onChangeVisible,
    });
    const visibleSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_visible_label'),
    });

    await user.click(visibleSwitch);
    expect(onChangeVisible).toHaveBeenCalledTimes(1);
  });

  it('calls change handler when delegable switch is toggled', async () => {
    const user = userEvent.setup();
    const onChangeDelegable = jest.fn();
    renderAppVisibilityAndDelegationCard({
      visible: false,
      delegable: false,
      onChangeDelegable,
    });

    const delegableSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_delegable_label'),
    });
    await user.click(delegableSwitch);
    expect(onChangeDelegable).toHaveBeenCalledTimes(1);
  });

  it('calls change handler when visible switch is toggled', async () => {
    const user = userEvent.setup();
    const onChangeVisible = jest.fn();
    renderAppVisibilityAndDelegationCard({
      visible: false,
      delegable: true,
      onChangeVisible,
    });
    const visibleSwitch = screen.getByRole('switch', {
      name: textMock('app_settings.about_tab_visibility_and_delegation_visible_label'),
    });

    await user.click(visibleSwitch);
    expect(onChangeVisible).toHaveBeenCalledTimes(1);
  });
});

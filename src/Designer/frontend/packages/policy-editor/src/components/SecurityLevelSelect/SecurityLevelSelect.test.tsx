import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SecurityLevelSelectProps } from './SecurityLevelSelect';
import { SecurityLevelSelect, authLevelOptions } from './SecurityLevelSelect';
import type { RemovedAuthLevel, RequiredAuthLevel } from '../../types';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockInitialAuthLevelValue: RequiredAuthLevel = '0';
const mockLabel: string = textMock('policy_editor.select_auth_level_label');
const removedAuthLevelError: string = textMock('policy_editor.auth_level_removed_error');
const mockSystemUserCheckboxLabel: string = textMock(
  'policy_editor.system_user_auth_level_checkbox_label',
);

const mockOnSave = vi.fn();

describe('SelectAuthLevel', () => {
  it('updates the selected value when the user changes the selection', async () => {
    renderSecurityLevelSelect();

    const [selectElement] = screen.getAllByLabelText(mockLabel);
    expect(selectElement).toHaveValue(authLevelOptions[0].value);

    await userEvent.selectOptions(
      selectElement,
      screen.getByRole('option', { name: textMock(authLevelOptions[2].label) }),
    );

    expect(mockOnSave).toHaveBeenCalledWith(authLevelOptions[2].value, undefined);
  });

  it('hides the system user checkbox when the security level is lower than 4', () => {
    renderSecurityLevelSelect({ requiredAuthenticationLevelEndUser: '3' });

    expect(
      screen.queryByRole('checkbox', { name: mockSystemUserCheckboxLabel }),
    ).not.toBeInTheDocument();
  });

  it('shows an unchecked system user checkbox when the security level is 4 and no system user level is set', () => {
    renderSecurityLevelSelect({ requiredAuthenticationLevelEndUser: '4' });

    expect(screen.getByRole('checkbox', { name: mockSystemUserCheckboxLabel })).not.toBeChecked();
  });

  it('shows a checked system user checkbox when the system user level is set to 3', () => {
    renderSecurityLevelSelect({
      requiredAuthenticationLevelEndUser: '4',
      requiredAuthenticationLevelSystemUser: '3',
    });

    expect(screen.getByRole('checkbox', { name: mockSystemUserCheckboxLabel })).toBeChecked();
  });

  it('saves system user level 3 when the user checks the system user checkbox', async () => {
    renderSecurityLevelSelect({ requiredAuthenticationLevelEndUser: '4' });

    await userEvent.click(screen.getByRole('checkbox', { name: mockSystemUserCheckboxLabel }));

    expect(mockOnSave).toHaveBeenCalledWith('4', '3');
  });

  it('removes the system user level when the user unchecks the system user checkbox', async () => {
    renderSecurityLevelSelect({
      requiredAuthenticationLevelEndUser: '4',
      requiredAuthenticationLevelSystemUser: '3',
    });

    await userEvent.click(screen.getByRole('checkbox', { name: mockSystemUserCheckboxLabel }));

    expect(mockOnSave).toHaveBeenCalledWith('4', undefined);
  });

  it('removes the system user level when the security level is raised to 4', async () => {
    renderSecurityLevelSelect({
      requiredAuthenticationLevelEndUser: '3',
      requiredAuthenticationLevelSystemUser: '3',
    });

    const selectElement = screen.getByRole('combobox', { name: mockLabel });
    await userEvent.selectOptions(
      selectElement,
      screen.getByRole('option', { name: textMock('policy_editor.auth_level_option_4') }),
    );

    expect(mockOnSave).toHaveBeenCalledWith('4', undefined);
  });

  it('removes the system user level when the security level is lowered from 4', async () => {
    renderSecurityLevelSelect({
      requiredAuthenticationLevelEndUser: '4',
      requiredAuthenticationLevelSystemUser: '3',
    });

    const selectElement = screen.getByRole('combobox', { name: mockLabel });
    await userEvent.selectOptions(
      selectElement,
      screen.getByRole('option', { name: textMock('policy_editor.auth_level_option_3') }),
    );

    expect(mockOnSave).toHaveBeenCalledWith('3', undefined);
  });

  it.each<RemovedAuthLevel>(['1', '2'])(
    'shows the removed auth level %s as a selected, disabled option with an error',
    (level) => {
      renderSecurityLevelSelect({ requiredAuthenticationLevelEndUser: level });

      const removedOption = screen.getByRole<HTMLOptionElement>('option', {
        name: textMock('policy_editor.auth_level_option_removed', { level }),
      });
      expect(removedOption).toBeDisabled();
      expect(removedOption.selected).toBe(true);
      expect(screen.getByText(removedAuthLevelError)).toBeInTheDocument();
    },
  );

  it('does not show the removed option or the error when the auth level is supported', () => {
    renderSecurityLevelSelect();

    expect(screen.getAllByRole('option')).toHaveLength(authLevelOptions.length);
    expect(screen.queryByText(removedAuthLevelError)).not.toBeInTheDocument();
  });
});

const defaultProps: SecurityLevelSelectProps = {
  requiredAuthenticationLevelEndUser: mockInitialAuthLevelValue,
  onSave: mockOnSave,
};

const renderSecurityLevelSelect = (props: Partial<SecurityLevelSelectProps> = {}) =>
  render(<SecurityLevelSelect {...defaultProps} {...props} />);

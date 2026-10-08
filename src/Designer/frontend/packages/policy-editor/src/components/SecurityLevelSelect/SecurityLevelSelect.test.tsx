import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SecurityLevelSelectProps } from './SecurityLevelSelect';
import { SecurityLevelSelect, authlevelOptions } from './SecurityLevelSelect';
import type { RemovedAuthLevel, RequiredAuthLevel } from '../../types';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockInitialAuthLevelValue: RequiredAuthLevel = '0';
const mockLabel: string = textMock('policy_editor.select_auth_level_label');
const removedAuthLevelError: string = textMock('policy_editor.auth_level_removed_error');

const mockOnSave = vi.fn();

describe('SelectAuthLevel', () => {
  afterEach(vi.clearAllMocks);

  it('updates the selected value when the user changes the selection', async () => {
    renderSecurityLevelSelect();

    const [selectElement] = screen.getAllByLabelText(mockLabel);
    expect(selectElement).toHaveValue(authlevelOptions[0].value);

    await userEvent.selectOptions(
      selectElement,
      screen.getByRole('option', { name: textMock(authlevelOptions[2].label) }),
    );

    expect(mockOnSave).toHaveBeenCalledWith(authlevelOptions[2].value);
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

    expect(screen.getAllByRole('option')).toHaveLength(authlevelOptions.length);
    expect(screen.queryByText(removedAuthLevelError)).not.toBeInTheDocument();
  });
});

const defaultProps: SecurityLevelSelectProps = {
  requiredAuthenticationLevelEndUser: mockInitialAuthLevelValue,
  onSave: mockOnSave,
};

const renderSecurityLevelSelect = (props: Partial<SecurityLevelSelectProps> = {}) =>
  render(<SecurityLevelSelect {...defaultProps} {...props} />);

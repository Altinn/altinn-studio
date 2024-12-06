import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SecurityLevelSelectProps } from './SecurityLevelSelect';
import { SecurityLevelSelect, authlevelOptions } from './SecurityLevelSelect';
import type { RequiredAuthLevel } from '../../types';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockInitialAuthLevelValue: RequiredAuthLevel = '0';
const mockLabel: string = textMock('policy_editor.select_auth_level_label');

const mockOnSave = jest.fn();

describe('SelectAuthLevel', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: SecurityLevelSelectProps = {
    requiredAuthenticationLevelEndUser: mockInitialAuthLevelValue,
    onSave: mockOnSave,
  };

  it('updates the selected value when the user changes the selection', async () => {
    render(<SecurityLevelSelect {...defaultProps} />);

    const [selectElement] = screen.getAllByLabelText(mockLabel);
    expect(selectElement).toHaveValue(authlevelOptions[0].value);

    await userEvent.selectOptions(
      selectElement,
      screen.getByRole('option', { name: textMock(authlevelOptions[2].label) }),
    );

    expect(mockOnSave).toHaveBeenCalledWith(authlevelOptions[2].value);
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SecurityLevelSelectProps } from './SecurityLevelSelect';
import { SecurityLevelSelect, authlevelOptions } from './SecurityLevelSelect';
import type { RequiredAuthLevel } from '../../types';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';

const mockInitialAuthLevelValue: RequiredAuthLevel = '0';
const mockInitialAuthLevelLabel: string = textMock(authlevelOptions[0].label);
const mockLabel: string = textMock('policy_editor.select_auth_level_label');

const mockOnSave = jest.fn();

describe('SelectAuthLevel', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: SecurityLevelSelectProps = {
    requiredAuthenticationLevelEndUser: mockInitialAuthLevelValue,
    onSave: mockOnSave,
  };

  it('updates the selected value when the user changes the selection', async () => {
    const user = userEvent.setup();
    render(<SecurityLevelSelect {...defaultProps} />);

    const [selectElement] = screen.getAllByLabelText(mockLabel);

    expect(selectElement).toHaveValue(mockInitialAuthLevelLabel);

    await act(() => user.click(selectElement));

    const mockOption2 = textMock(authlevelOptions[2].label);
    await act(() => user.click(screen.getByRole('option', { name: mockOption2 })));

    expect(mockOnSave).toHaveBeenCalledWith(authlevelOptions[2].value);
  });
});

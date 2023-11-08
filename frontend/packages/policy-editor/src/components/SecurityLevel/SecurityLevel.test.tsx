import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecurityLevel, SecurityLevelProps, authlevelOptions } from './SecurityLevel';
import { RequiredAuthLevel } from '../../types';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';

const mockInitialAuthLevelValue: RequiredAuthLevel = '0';
const mockInitialAuthLevelLabel: string = authlevelOptions[0].label;
const mockLabel: string = textMock('policy_editor.select_auth_level_label');

const mockOnSave = jest.fn();

describe('SelectAuthLevel', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: SecurityLevelProps = {
    usageType: 'app',
    requiredAuthenticationLevelEndUser: mockInitialAuthLevelValue,
    onSave: mockOnSave,
  };

  it('updates the selected value when the user changes the selection', async () => {
    const user = userEvent.setup();
    render(<SecurityLevel {...defaultProps} />);

    const [selectElement] = screen.getAllByLabelText(mockLabel);
    expect(selectElement).toHaveValue(mockInitialAuthLevelLabel);
    await act(() => user.click(selectElement));

    await act(() => user.click(screen.getByRole('option', { name: authlevelOptions[2].label })));

    expect(mockOnSave).toHaveBeenCalledWith(authlevelOptions[2].value);
  });
});

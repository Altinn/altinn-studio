import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectAuthLevel, SelectAuthLevelProps, authlevelOptions } from './SelectAuthLevel';
import { RequiredAuthLevel } from '../../types';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';

const mockInitialAuthLevelValue: RequiredAuthLevel = '0';
const mockInitialAuthLevelLabel: string = authlevelOptions[0].label;
const mockLabel: string = textMock('policy_editor.select_auth_level_label');

describe('SelectAuthLevel', () => {
  const mockSetValue = jest.fn();
  const mockOnBlur = jest.fn();

  const defaultProps: SelectAuthLevelProps = {
    value: mockInitialAuthLevelValue,
    setValue: mockSetValue,
    label: mockLabel,
    onBlur: mockOnBlur,
  };

  it('updates the selected value when the user changes the selection', async () => {
    const user = userEvent.setup();
    render(<SelectAuthLevel {...defaultProps} />);

    const [selectElement] = screen.getAllByLabelText(mockLabel);
    expect(selectElement).toHaveValue(mockInitialAuthLevelLabel);
    await act(() => user.click(selectElement));

    await act(() => user.click(screen.getByRole('option', { name: authlevelOptions[2].label })));

    expect(mockSetValue).toHaveBeenCalledWith(authlevelOptions[2].value);
  });

  it('calls the onBlur function when the input is blurred', async () => {
    const user = userEvent.setup();
    render(<SelectAuthLevel {...defaultProps} />);

    const [selectElement] = screen.getAllByLabelText(mockLabel);
    await act(() => user.click(selectElement));
    await act(() => user.click(screen.getByRole('option', { name: authlevelOptions[2].label })));
    await act(() => user.tab());

    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });
});

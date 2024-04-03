import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EnumFieldProps } from './EnumField';
import { EnumField } from './EnumField';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';

const mockValue: string = 'test';
const mockIndex: number = 0;

const mockOnChange = jest.fn();
const mockOnDelete = jest.fn();
const mockOnEnterKeyPress = jest.fn();

const defaultProps: EnumFieldProps = {
  value: mockValue,
  readOnly: false,
  isValid: true,
  onChange: mockOnChange,
  onDelete: mockOnDelete,
  onEnterKeyPress: mockOnEnterKeyPress,
  index: mockIndex,
};

describe('EnumField', () => {
  afterEach(jest.clearAllMocks);

  it('calls onChange when input value changes', async () => {
    const user = userEvent.setup();
    render(<EnumField {...defaultProps} />);

    const textField = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: mockIndex }),
    });
    expect(textField).toHaveValue(mockValue);

    const newValue: string = '1';

    await act(() => user.type(textField, newValue));
    await act(() => user.tab());

    const updatedValue: string = `${mockValue}${newValue}`;

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(updatedValue);

    const textFieldAfter = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: mockIndex }),
    });
    expect(textFieldAfter).toHaveValue(updatedValue);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<EnumField {...defaultProps} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', {
      name: textMock('schema_editor.delete_field'),
    });
    expect(deleteButton).toBeInTheDocument();

    await act(() => user.click(deleteButton));

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onEnterKeyPress when "Enter" key is pressed', async () => {
    const user = userEvent.setup();
    render(<EnumField {...defaultProps} />);

    const textField = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: mockIndex }),
    });

    const newValue: string = '1';

    await act(() => user.type(textField, newValue));
    await act(() => user.keyboard('{Enter}'));

    expect(mockOnEnterKeyPress).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnumField, EnumFieldProps } from './EnumField';
import { textMock } from '../../../../../testing/mocks/i18nMock';

const mockPath: string = 'mockPath';
const mockValue: string = 'test';
const mockBaseId: string = 'id123';
const mockId: string = `${mockBaseId}-enum-${mockValue}`;

const mockOnChange = jest.fn();
const mockOnDelete = jest.fn();
const mockOnEnterKeyPress = jest.fn();

const defaultProps: EnumFieldProps = {
  path: mockPath,
  value: mockValue,
  readOnly: false,
  isValid: true,
  onChange: mockOnChange,
  onEnterKeyPress: mockOnEnterKeyPress,
  baseId: mockBaseId,
};

describe('EnumField', () => {
  afterEach(jest.clearAllMocks);

  it('calls onChange when input value changes', async () => {
    const user = userEvent.setup();
    render(<EnumField {...defaultProps} />);

    const textField = screen.getByLabelText(
      textMock('schema_editor.textfield_label', { id: mockId }),
    );
    expect(textField).toHaveValue(mockValue);

    const newValue: string = '1';

    await act(() => user.type(textField, newValue));
    await act(() => user.tab());

    const updatedValue: string = `${mockValue}${newValue}`;

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(updatedValue, mockValue);

    const textFieldAfter = screen.getByLabelText(
      textMock('schema_editor.textfield_label', { id: mockId }),
    );
    expect(textFieldAfter).toHaveValue(updatedValue);
  });

  it('hides delete button when onDelete is not present', () => {
    render(<EnumField {...defaultProps} />);

    const deleteButton = screen.queryByRole('button', {
      name: textMock('schema_editor.delete_field'),
    });
    expect(deleteButton).not.toBeInTheDocument();
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
    expect(mockOnDelete).toHaveBeenCalledWith(mockPath, mockValue);
  });

  it('calls onEnterKeyPress when "Enter" key is pressed', async () => {
    const user = userEvent.setup();
    render(<EnumField {...defaultProps} />);

    const textField = screen.getByLabelText(
      textMock('schema_editor.textfield_label', { id: mockId }),
    );

    const newValue: string = '1';

    await act(() => user.type(textField, newValue));
    await act(() => user.keyboard('{Enter}'));

    expect(mockOnEnterKeyPress).toHaveBeenCalledTimes(1);
  });
});

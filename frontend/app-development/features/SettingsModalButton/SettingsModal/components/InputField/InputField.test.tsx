import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { InputField, InputFieldProps } from './InputField';
import userEvent from '@testing-library/user-event';

const mockInputId: string = 'testId';
const mockLabel: string = 'Test label';
const mockDescription: string = 'Test description';
const mockValue: string = 'test';
const mockErrorText: string = 'Test error message';

const mockNewText: string = '1';

describe('InputField', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  const defaultProps: InputFieldProps = {
    id: mockInputId,
    label: mockLabel,
    description: mockDescription,
    value: mockValue,
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    isValid: true,
    errorText: mockErrorText,
    readOnly: false,
  };

  it('calls onChange function when input value changes', async () => {
    render(<InputField {...defaultProps} />);

    const inputField = screen.getByLabelText(mockLabel);
    expect(inputField).toHaveValue(mockValue);

    await act(() => user.type(inputField, mockNewText));

    expect(mockOnChange).toHaveBeenCalledWith(`${mockValue}${mockNewText}`);
    expect(mockOnChange).toHaveBeenCalledTimes(mockNewText.length);
  });

  it('calls onBlur function when input field loses focus', async () => {
    render(<InputField {...defaultProps} />);

    const inputField = screen.getByLabelText(mockLabel);

    await act(() => user.type(inputField, mockNewText));
    await act(() => user.tab());

    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });

  it('displays error message when isValid is false', () => {
    render(<InputField {...defaultProps} isValid={false} />);

    const errorMessage = screen.getByText(mockErrorText);
    expect(errorMessage).toBeInTheDocument();
  });

  it('does not display error message when isValid is true', () => {
    render(<InputField {...defaultProps} />);

    const errorMessage = screen.queryByText(mockErrorText);
    expect(errorMessage).not.toBeInTheDocument();
  });
});

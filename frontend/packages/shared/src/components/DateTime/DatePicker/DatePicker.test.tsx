import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatePicker, DatePickerProps } from './DatePicker';

const mockDateString: string = '2023-10-12';
const mockDateStringNew: string = '2023-10-13';

const mockValue: Date = new Date(mockDateString);
const mockOnChange = jest.fn();
const mockLabel: string = 'Test label';

const defaultProps: DatePickerProps = {
  value: mockValue,
  onChange: mockOnChange,
  label: mockLabel,
};

describe('DatePicker', () => {
  afterEach(jest.clearAllMocks);

  it('calls "onChange" when date is changed', () => {
    render(<DatePicker {...defaultProps} />);

    const input = screen.getByLabelText(mockLabel);
    expect(input).toHaveValue(mockDateString);

    fireEvent.change(input, { target: { value: mockDateStringNew } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(new Date(mockDateStringNew));
  });
});

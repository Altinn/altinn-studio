import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateAndTimeRow, DateAndTimeRowProps } from './DateAndTimeRow';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';

const mockDate: string = '2023-10-13';
const mockTime: string = '10:15';
const mockNewDate: string = '2023-12-13';
const mockNewTime: string = '12:15';

const mockDateLabel: string = 'Test label';
const mockDateValue: string = `${mockDate}T${mockTime}:00`;
const mockOnSave = jest.fn();
const mockIsDateValid: boolean = false;
const mockInvalidDateErrorMessage: string = 'Test error message';

const defaultProps: DateAndTimeRowProps = {
  dateLabel: mockDateLabel,
  dateValue: mockDateValue,
  onSave: mockOnSave,
};

describe('DateAndTimeRow', () => {
  afterEach(jest.clearAllMocks);

  it('updates date on change', () => {
    render(<DateAndTimeRow {...defaultProps} />);

    const dateInput = screen.getByLabelText(mockDateLabel);
    expect(dateInput).toHaveValue(mockDate);

    fireEvent.change(dateInput, { target: { value: mockNewDate } });

    const dateInputAfter = screen.getByLabelText(mockDateLabel);
    expect(dateInputAfter).toHaveValue(mockNewDate);
  });

  it('updates time on change', () => {
    render(<DateAndTimeRow {...defaultProps} />);

    const timeInput = screen.getByLabelText(textMock('settings_modal.setup_tab_time_label'));
    expect(timeInput).toHaveValue(mockTime);

    fireEvent.change(timeInput, { target: { value: mockNewTime } });

    const timeInputAfter = screen.getByLabelText(textMock('settings_modal.setup_tab_time_label'));
    expect(timeInputAfter).toHaveValue(mockNewTime);
  });

  it('calls "onSave" with the correct date when date field is blurred', () => {
    render(<DateAndTimeRow {...defaultProps} />);

    const dateInput = screen.getByLabelText(mockDateLabel);
    fireEvent.change(dateInput, { target: { value: mockNewDate } });
    fireEvent.blur(dateInput);

    expect(mockOnSave).toHaveBeenCalledWith(`${mockNewDate}T${mockTime}:00.000Z`);
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('calls "onSave" with the correct date when time field is blurred', () => {
    render(<DateAndTimeRow {...defaultProps} />);

    const timeInput = screen.getByLabelText(textMock('settings_modal.setup_tab_time_label'));
    fireEvent.change(timeInput, { target: { value: mockNewTime } });
    fireEvent.blur(timeInput);

    expect(mockOnSave).toHaveBeenCalledWith(`${mockDate}T${mockNewTime}:00.000Z`);
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('displays error message when date is invalid and time is valid', () => {
    render(<DateAndTimeRow {...defaultProps} dateValue={undefined} />);

    const timeInput = screen.getByLabelText(textMock('settings_modal.setup_tab_time_label'));

    const errorMessage = screen.queryByText(
      textMock('settings_modal.setup_tab_invalid_date_or_time'),
    );

    expect(errorMessage).not.toBeInTheDocument();
    fireEvent.change(timeInput, { target: { value: mockNewTime } });
    fireEvent.blur(timeInput);

    const errorMessageAfter = screen.getByText(
      textMock('settings_modal.setup_tab_invalid_date_or_time'),
    );
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('displays error message when time is invalid and date is valid', () => {
    render(<DateAndTimeRow {...defaultProps} dateValue={undefined} />);

    const dateInput = screen.getByLabelText(mockDateLabel);

    const errorMessage = screen.queryByText(
      textMock('settings_modal.setup_tab_invalid_date_or_time'),
    );

    expect(errorMessage).not.toBeInTheDocument();
    fireEvent.change(dateInput, { target: { value: mockNewDate } });
    fireEvent.blur(dateInput);

    const errorMessageAfter = screen.getByText(
      textMock('settings_modal.setup_tab_invalid_date_or_time'),
    );
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('displays custom error message when provided', () => {
    render(
      <DateAndTimeRow
        {...defaultProps}
        isDateValid={mockIsDateValid}
        invalidDateErrorMessage={mockInvalidDateErrorMessage}
      />,
    );

    const errorMessageAfter = screen.getByText(mockInvalidDateErrorMessage);
    expect(errorMessageAfter).toBeInTheDocument();
  });
});

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';

import DatepickerComponent from './DatepickerComponent';
import type { IComponentProps } from 'src/components';
import type { IDatePickerProps } from './DatepickerComponent';

const render = (props: Partial<IDatePickerProps> = {}) => {
  const allProps: IDatePickerProps = {
    format: 'DD.MM.YYYY',
    minDate: '1900-01-01T12:00:00.000Z',
    maxDate: '2100-01-01T12:00:00.000Z',
    handleDataChange: jest.fn(),
    ...({} as IComponentProps),
    ...props,
  };

  rtlRender(<DatepickerComponent {...allProps} />);
};

const currentYearNumeric = new Date().toLocaleDateString(navigator.language, {
  year: 'numeric',
});

const currentMonthNumeric = new Date().toLocaleDateString(navigator.language, {
  month: '2-digit',
});

const getCalendarYearHeader = (method = 'getByRole') =>
  screen[method]('heading', {
    name: currentYearNumeric,
  });

const getOpenCalendarButton = () =>
  screen.getByRole('button', {
    name: /date_picker\.aria_label_icon/i,
  });

const getCalendarDayButton = (dayNumber) =>
  screen.getByRole('button', {
    name: dayNumber,
    hidden: true,
  });

export const setScreenWidth = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.matchMedia = jest.fn().mockImplementation((query) => {
    return {
      matches: width <= 600 ? true : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
  });
};

describe('DatepickerComponent', () => {
  beforeEach(() => {
    setScreenWidth(1366);
  });

  it('should not show calendar initially, and show calendar when clicking calendar button', () => {
    render();

    expect(getCalendarYearHeader('queryByRole')).not.toBeInTheDocument();

    userEvent.click(getOpenCalendarButton());

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not show calendar initially, and show calendar in a dialog when clicking calendar button, and screen size is mobile sized', () => {
    setScreenWidth(400);
    render();

    expect(getCalendarYearHeader('queryByRole')).not.toBeInTheDocument();

    userEvent.click(getOpenCalendarButton());

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')[0]).toBeInTheDocument();
  });

  it('should call handleDataChange when clicking date in calendar', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    userEvent.click(getOpenCalendarButton());
    userEvent.click(getCalendarDayButton('25'));

    expect(handleDataChange).toHaveBeenCalledWith(
      // Ignore TZ part of timestamp to avoid test failing when this changes
      // Calendar opens up on current year/month by default, so we need to cater for this in the expected output
      expect.stringContaining(
        `${currentYearNumeric}-${currentMonthNumeric}-25T12:00:00.000+`,
      ),
    );
  });

  it('should call handleDataChange with correct value when timeStamp is undefined when field is changed with a valid date', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: undefined });

    const inputField = screen.getByRole('textbox');

    userEvent.type(inputField, '12.26.2022');

    expect(handleDataChange).toHaveBeenCalledWith(
      // Ignore TZ part of timestamp to avoid test failing when this changes
      expect.stringContaining('2022-12-26T12:00:00.000+'),
    );
  });

  it('should call handleDataChange with correct value when timeStamp is true when field is changed with a valid date', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: true });

    const inputField = screen.getByRole('textbox');

    userEvent.type(inputField, '12.26.2022');

    expect(handleDataChange).toHaveBeenCalledWith(
      // Ignore TZ part of timestamp to avoid test failing when this changes
      expect.stringContaining('2022-12-26T12:00:00.000+'),
    );
  });

  it('should call handleDataChange with correct value when timeStamp is false when field is changed with a valid date', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: false });

    const inputField = screen.getByRole('textbox');

    userEvent.type(inputField, '12.26.2022');

    expect(handleDataChange).toHaveBeenCalledWith('2022-12-26');
  });

  it('should not call handleDataChange when field is changed with a invalid date', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    const inputField = screen.getByRole('textbox');

    userEvent.type(inputField, 'banana');

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('should show error message when input is before today, and minDate is today and not call handleDataChange', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, minDate: 'today', required: true });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('date_picker.min_date_exeeded'),
    ).not.toBeInTheDocument();

    const inputField = screen.getByRole('textbox');

    userEvent.type(inputField, `12.13.${Number(currentYearNumeric) - 1}`);
    fireEvent.blur(inputField);

    expect(handleDataChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('date_picker.min_date_exeeded'),
    ).toBeInTheDocument();
  });

  it('should show error message when input is after today, and maxDate is today and not call handleDataChange', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, maxDate: 'today', required: true });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('date_picker.max_date_exeeded'),
    ).not.toBeInTheDocument();

    const inputField = screen.getByRole('textbox');

    userEvent.type(inputField, `12.13.${Number(currentYearNumeric) + 1}`);
    fireEvent.blur(inputField);

    expect(handleDataChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('date_picker.max_date_exeeded'),
    ).toBeInTheDocument();
  });

  it('should show error message when typed date is on invalid format but not call handleDataChange when formdata is NOT present ', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('date_picker.invalid_date_message'),
    ).not.toBeInTheDocument();

    const inputField = screen.getByRole('textbox');

    userEvent.type(inputField, '45.45.4545');
    fireEvent.blur(inputField);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('date_picker.invalid_date_message'),
    ).toBeInTheDocument();

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('should show error message when typed date is on an invalid format and call handleDataChange with empy value if formdata is present', () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, formData: { simpleBinding: '12.12.2022' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('date_picker.invalid_date_message'),
    ).not.toBeInTheDocument();

    const inputField = screen.getByRole('textbox');

    userEvent.clear(inputField);
    userEvent.type(inputField, `45.45.4545`);
    fireEvent.blur(inputField);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    expect(
      screen.getByText('date_picker.invalid_date_message'),
    ).toBeInTheDocument();

    expect(handleDataChange).toHaveBeenCalledWith('');
  });
});

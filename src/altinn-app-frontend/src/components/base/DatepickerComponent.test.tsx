import React from 'react';

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMediaQuery, renderWithProviders } from 'testUtils';
import type { PreloadedState } from 'redux';

import DatepickerComponent from 'src/components/base/DatepickerComponent';
import type { IDatePickerProps } from 'src/components/base/DatepickerComponent';
import type { RootState } from 'src/store';

const render = (
  props: Partial<IDatePickerProps> = {},
  customState: PreloadedState<RootState> = {},
) => {
  const allProps: IDatePickerProps = {
    format: 'DD.MM.YYYY',
    minDate: '1900-01-01T12:00:00.000Z',
    maxDate: '2100-01-01T12:00:00.000Z',
    handleDataChange: jest.fn(),
    ...({} as IDatePickerProps),
    ...props,
  };

  renderWithProviders(<DatepickerComponent {...allProps} />, {
    preloadedState: customState,
  });
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

const getCalendarDayButton = (dayNumber) => {
  // Getting by role would be better, but it is too slow, because of the big DOM that is generated
  return screen.getByText(dayNumber);
};

const { setScreenWidth } = mockMediaQuery(600);

describe('DatepickerComponent', () => {
  beforeEach(() => {
    setScreenWidth(1366);
  });

  it('should not show calendar initially, and show calendar when clicking calendar button', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    render();

    expect(getCalendarYearHeader('queryByRole')).not.toBeInTheDocument();

    await userEvent.click(getOpenCalendarButton());

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /Material-UI: The `fade` color utility was renamed to `alpha` to better describe its functionality/,
      ),
    );
  });

  it('should not show calendar initially, and show calendar in a dialog when clicking calendar button, and screen size is mobile sized', async () => {
    setScreenWidth(400);
    render();

    expect(getCalendarYearHeader('queryByRole')).not.toBeInTheDocument();

    await userEvent.click(getOpenCalendarButton());

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')[0]).toBeInTheDocument();
  });

  it('should call handleDataChange when clicking date in calendar', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    await userEvent.click(getOpenCalendarButton());
    await userEvent.click(getCalendarDayButton('15'));

    expect(handleDataChange).toHaveBeenCalledWith(
      // Ignore TZ part of timestamp to avoid test failing when this changes
      // Calendar opens up on current year/month by default, so we need to cater for this in the expected output
      expect.stringContaining(
        `${currentYearNumeric}-${currentMonthNumeric}-15T12:00:00.000+`,
      ),
    );
  });

  it('should call handleDataChange with correct value when timeStamp is undefined when field is changed with a valid date', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: undefined });

    const inputField = screen.getByRole('textbox');

    await userEvent.type(inputField, '12.26.2022');

    expect(handleDataChange).toHaveBeenCalledWith(
      // Ignore TZ part of timestamp to avoid test failing when this changes
      expect.stringContaining('2022-12-26T12:00:00.000+'),
    );
  });

  it('should call handleDataChange with correct value when timeStamp is true when field is changed with a valid date', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: true });

    const inputField = screen.getByRole('textbox');

    await userEvent.type(inputField, '12.26.2022');

    expect(handleDataChange).toHaveBeenCalledWith(
      // Ignore TZ part of timestamp to avoid test failing when this changes
      expect.stringContaining('2022-12-26T12:00:00.000+'),
    );
  });

  it('should call handleDataChange with correct value when timeStamp is false when field is changed with a valid date', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: false });

    const inputField = screen.getByRole('textbox');

    await userEvent.type(inputField, '12.26.2022');

    expect(handleDataChange).toHaveBeenCalledWith('2022-12-26');
  });

  it('should not call handleDataChange when field is changed with a invalid date', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    const inputField = screen.getByRole('textbox');

    await userEvent.type(inputField, 'banana');

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('should show error message when input is before today, and minDate is today and not call handleDataChange', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, minDate: 'today', required: true });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('date_picker.min_date_exeeded'),
    ).not.toBeInTheDocument();

    const inputField = screen.getByRole('textbox');

    await userEvent.type(inputField, `12.13.${Number(currentYearNumeric) - 1}`);
    fireEvent.blur(inputField);

    expect(handleDataChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('date_picker.min_date_exeeded'),
    ).toBeInTheDocument();
  });

  it('should show error message when input is after today, and maxDate is today and not call handleDataChange', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, maxDate: 'today', required: true });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('date_picker.max_date_exeeded'),
    ).not.toBeInTheDocument();

    const inputField = screen.getByRole('textbox');

    await userEvent.type(inputField, `12.13.${Number(currentYearNumeric) + 1}`);
    fireEvent.blur(inputField);

    expect(handleDataChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('date_picker.max_date_exeeded'),
    ).toBeInTheDocument();
  });

  it('should show error message when typed date is on invalid format but not call handleDataChange when formdata is NOT present ', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('date_picker.invalid_date_message'),
    ).not.toBeInTheDocument();

    const inputField = screen.getByRole('textbox');

    await userEvent.type(inputField, '45.45.4545');
    fireEvent.blur(inputField);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('date_picker.invalid_date_message'),
    ).toBeInTheDocument();

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('should show error message when typed date is on an invalid format and call handleDataChange with empty value if formdata is present', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    const handleDataChange = jest.fn();
    render({ handleDataChange, formData: { simpleBinding: '12.12.2022' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('date_picker.invalid_date_message'),
    ).not.toBeInTheDocument();

    const inputField = screen.getByRole('textbox');

    await userEvent.clear(inputField);
    await userEvent.type(inputField, `45.45.4545`);
    fireEvent.blur(inputField);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /Deprecation warning: value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date/,
      ),
    );

    expect(
      screen.getByText('date_picker.invalid_date_message'),
    ).toBeInTheDocument();

    expect(handleDataChange).toHaveBeenCalledWith('');
  });

  it('should have aria-describedby if textResourceBindings.description is present', () => {
    render({
      textResourceBindings: { description: 'description' },
      id: 'test-id',
    });
    const inputField = screen.getByRole('textbox');
    expect(inputField).toHaveAttribute(
      'aria-describedby',
      'description-test-id',
    );
  });

  it('should not have aria-describedby if textResources.description does not exist', () => {
    render({ textResourceBindings: {}, id: 'test-id' });
    const inputField = screen.getByRole('textbox');
    expect(inputField).not.toHaveAttribute('aria-describedby');
  });
});

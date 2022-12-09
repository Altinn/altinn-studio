import React from 'react';

import { fireEvent, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockComponentProps, mockMediaQuery, renderWithProviders } from 'testUtils';
import type { PreloadedState } from 'redux';

import DatepickerComponent from 'src/components/base/DatepickerComponent';
import type { IDatePickerProps } from 'src/components/base/DatepickerComponent';
import type { RootState } from 'src/store';

// Mock dateformat
jest.mock('src/utils/dateHelpers', () => {
  return {
    __esModules: true,
    ...jest.requireActual('src/utils/dateHelpers'),
    getDateFormat: jest.fn(() => 'DD.MM.YYYY'),
  };
});

const render = (props: Partial<IDatePickerProps> = {}, customState: PreloadedState<RootState> = {}) => {
  const allProps: IDatePickerProps = {
    ...mockComponentProps,
    minDate: '1900-01-01T12:00:00.000Z',
    maxDate: '2100-01-01T12:00:00.000Z',
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

    await act(() => userEvent.click(getOpenCalendarButton()));

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledTimes(2);
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

    await act(() => userEvent.click(getOpenCalendarButton()));

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')[0]).toBeInTheDocument();
  });

  it('should call handleDataChange when clicking date in calendar', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    await act(() => userEvent.click(getOpenCalendarButton()));
    await act(() => userEvent.click(getCalendarDayButton('15')));

    expect(handleDataChange).toHaveBeenCalledWith(
      // Ignore TZ part of timestamp to avoid test failing when this changes
      // Calendar opens up on current year/month by default, so we need to cater for this in the expected output
      expect.stringContaining(`${currentYearNumeric}-${currentMonthNumeric}-15T12:00:00.000+`),
    );
  });

  it('should call handleDataChange without skipping validation if date is cleared', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, formData: { simpleBinding: '2022-12-31' } });

    const inputField = screen.getByRole('textbox');

    await act(async () => {
      await userEvent.clear(inputField);
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith('');
  });

  it('should call handleDataChange with formatted value (timestamp=true) without skipping validation if date is valid', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: true });

    const inputField = screen.getByRole('textbox');

    await act(async () => {
      await userEvent.type(inputField, '31122022');
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith(expect.stringContaining('2022-12-31T12:00:00.000+'));
  });

  it('should call handleDataChange with formatted value (timestamp=false) without skipping validation if date is valid', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: false });

    const inputField = screen.getByRole('textbox');

    await act(async () => {
      await userEvent.type(inputField, '31122022');
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith('2022-12-31');
  });

  it('should call handleDataChange with formatted value (timestamp=undefined) without skipping validation if date is valid', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange, timeStamp: undefined });

    const inputField = screen.getByRole('textbox');

    await act(async () => {
      await userEvent.type(inputField, '31122022');
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith(expect.stringContaining('2022-12-31T12:00:00.000+'));
  });

  it('should call handleDataChange without skipping validation if date is invalid but finished filling out', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    const inputField = screen.getByRole('textbox');

    await act(async () => {
      await userEvent.type(inputField, '12345678');
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith('12.34.5678');
  });

  it('should call handleDataChange with skipValidation=true if not finished filling out the date', async () => {
    const handleDataChange = jest.fn();
    render({ handleDataChange });

    const inputField = screen.getByRole('textbox');
    await act(async () => {
      await userEvent.type(inputField, `1234`);
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith('12.34.____', { validate: false });
  });

  it('should have aria-describedby if textResourceBindings.description is present', () => {
    render({
      textResourceBindings: { description: 'description' },
      id: 'test-id',
    });
    const inputField = screen.getByRole('textbox');
    expect(inputField).toHaveAttribute('aria-describedby', 'description-test-id');
  });

  it('should not have aria-describedby if textResources.description does not exist', () => {
    render({ textResourceBindings: {}, id: 'test-id' });
    const inputField = screen.getByRole('textbox');
    expect(inputField).not.toHaveAttribute('aria-describedby');
  });
});

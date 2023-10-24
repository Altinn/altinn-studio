import React from 'react';

import { act, fireEvent, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

// Mock dateformat
jest.mock('src/utils/dateHelpers', () => ({
  __esModules: true,
  ...jest.requireActual('src/utils/dateHelpers'),
  getDateFormat: jest.fn(() => 'DD.MM.YYYY'),
}));

const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Datepicker'>> = {}) => {
  // eslint-disable-next-line testing-library/await-async-events
  const user = userEvent.setup();
  renderGenericComponentTest({
    type: 'Datepicker',
    renderer: (props) => <DatepickerComponent {...props} />,
    component: {
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      ...component,
    },
    genericProps,
  });

  return { user };
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
    name: /Åpne datovelger/i,
  });

const getCalendarDayButton = (dayNumber) =>
  // Getting by role would be better, but it is too slow, because of the big DOM that is generated
  screen.getByText(dayNumber);
const { setScreenWidth } = mockMediaQuery(600);

describe('DatepickerComponent', () => {
  beforeEach(() => {
    setScreenWidth(1366);
  });

  it('should not show calendar initially, and show calendar when clicking calendar button', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    const { user } = render();

    expect(getCalendarYearHeader('queryByRole')).not.toBeInTheDocument();

    await act(() => user.click(getOpenCalendarButton()));

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
    const { user } = render();

    expect(getCalendarYearHeader('queryByRole')).not.toBeInTheDocument();

    await act(() => user.click(getOpenCalendarButton()));

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')[0]).toBeInTheDocument();
  });

  it('should call handleDataChange when clicking date in calendar', async () => {
    const handleDataChange = jest.fn();
    const { user } = render({ genericProps: { handleDataChange } });

    await act(() => user.click(getOpenCalendarButton()));
    await act(() => user.click(getCalendarDayButton('15')));

    expect(handleDataChange).toHaveBeenCalledWith(
      // Ignore TZ part of timestamp to avoid test failing when this changes
      // Calendar opens up on current year/month by default, so we need to cater for this in the expected output
      expect.stringContaining(`${currentYearNumeric}-${currentMonthNumeric}-15T12:00:00.000+`),
      { validate: true },
    );
  });

  it('should call handleDataChange without skipping validation if date is cleared', async () => {
    const handleDataChange = jest.fn();
    const { user } = render({ genericProps: { handleDataChange, formData: { simpleBinding: '2022-12-31' } } });

    const inputField = screen.getByRole('textbox');

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.clear(inputField);
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith('', { validate: true });
  });

  it('should call handleDataChange with formatted value (timestamp=true) without skipping validation if date is valid', async () => {
    const handleDataChange = jest.fn();
    const { user } = render({ genericProps: { handleDataChange }, component: { timeStamp: true } });

    const inputField = screen.getByRole('textbox');

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.type(inputField, '31122022');
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith(expect.stringContaining('2022-12-31T12:00:00.000+'), {
      validate: true,
    });
  });

  it('should call handleDataChange with formatted value (timestamp=false) without skipping validation if date is valid', async () => {
    const handleDataChange = jest.fn();
    const { user } = render({ genericProps: { handleDataChange }, component: { timeStamp: false } });

    const inputField = screen.getByRole('textbox');

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.type(inputField, '31122022');
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith('2022-12-31', { validate: true });
  });

  it('should call handleDataChange with formatted value (timestamp=undefined) without skipping validation if date is valid', async () => {
    const handleDataChange = jest.fn();
    const { user } = render({ genericProps: { handleDataChange }, component: { timeStamp: undefined } });

    const inputField = screen.getByRole('textbox');

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.type(inputField, '31122022');
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith(expect.stringContaining('2022-12-31T12:00:00.000+'), {
      validate: true,
    });
  });

  it('should call handleDataChange without skipping validation if date is invalid but finished filling out', async () => {
    const handleDataChange = jest.fn();
    const { user } = render({ genericProps: { handleDataChange } });

    const inputField = screen.getByRole('textbox');

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.type(inputField, '12345678');
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith('12.34.5678', { validate: true });
  });

  it('should call handleDataChange with skipValidation=true if not finished filling out the date', async () => {
    const handleDataChange = jest.fn();
    const { user } = render({ genericProps: { handleDataChange } });

    const inputField = screen.getByRole('textbox');

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.type(inputField, `1234`);
      fireEvent.blur(inputField);
    });

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith('12.34.____', { validate: false });
  });

  it('should have aria-describedby if textResourceBindings.description is present', () => {
    render({
      component: {
        textResourceBindings: { description: 'description' },
        id: 'test-id',
      },
    });
    const inputField = screen.getByRole('textbox');
    expect(inputField).toHaveAttribute('aria-describedby', 'description-test-id');
  });

  it('should not have aria-describedby if textResources.description does not exist', () => {
    render({ component: { textResourceBindings: {}, id: 'test-id' } });
    const inputField = screen.getByRole('textbox');
    expect(inputField).not.toHaveAttribute('aria-describedby');
  });
});

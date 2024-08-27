import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

// Mock dateformat
jest.mock('src/utils/dateHelpers', () => ({
  __esModules: true,
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...jest.requireActual<typeof import('src/utils/dateHelpers')>('src/utils/dateHelpers'),
  getDateFormat: jest.fn(() => 'DD.MM.YYYY'),
}));

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'Datepicker'>> = {}) =>
  await renderGenericComponentTest({
    type: 'Datepicker',
    renderer: (props) => <DatepickerComponent {...props} />,
    component: {
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      dataModelBindings: {
        simpleBinding: 'myDate',
      },
      ...component,
    },
    ...rest,
  });

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

const getCalendarDayButton = (dayNumber: string) =>
  // Getting by role would be better, but it is too slow, because of the big DOM that is generated
  screen.getByText(dayNumber);

const { setScreenWidth } = mockMediaQuery(600);

describe('DatepickerComponent', () => {
  beforeEach(() => {
    setScreenWidth(1366);
  });

  it('should not show calendar initially, and show calendar when clicking calendar button', async () => {
    jest.spyOn(console, 'error').mockName('console.error');
    await render();

    expect(getCalendarYearHeader('queryByRole')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: /Åpne datovelger/i,
      }),
    );

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /Material-UI: The `fade` color utility was renamed to `alpha` to better describe its functionality/,
      ),
    );
  });

  it('should not show calendar initially, and show calendar in a dialog when clicking calendar button, and screen size is mobile sized', async () => {
    setScreenWidth(400);
    await render();

    expect(getCalendarYearHeader('queryByRole')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: /Åpne datovelger/i,
      }),
    );

    expect(getCalendarYearHeader()).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')[0]).toBeInTheDocument();
  });

  it('should call setLeafValue when clicking date in calendar', async () => {
    const { formDataMethods } = await render();

    await userEvent.click(
      screen.getByRole('button', {
        name: /Åpne datovelger/i,
      }),
    );
    await userEvent.click(getCalendarDayButton('15'));

    // Ignore TZ part of timestamp to avoid test failing when this changes
    // Calendar opens up on current year/month by default, so we need to cater for this in the expected output
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'myDate',
      newValue: expect.stringContaining(`${currentYearNumeric}-${currentMonthNumeric}-15T12:00:00.000+`),
    });
  });

  it('should call setLeafValue if date is cleared', async () => {
    const { formDataMethods } = await render({
      queries: {
        fetchFormData: async () => ({ myDate: '2022-12-31' }),
      },
    });

    await userEvent.clear(screen.getByRole('textbox'));

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDate', newValue: '' });
  });

  it('should call setLeafValue with formatted value (timestamp=true) if date is valid', async () => {
    const { formDataMethods } = await render({ component: { timeStamp: true } });

    await userEvent.type(screen.getByRole('textbox'), '31122022');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'myDate',
      newValue: expect.stringContaining('2022-12-31T12:00:00.000+'),
    });
  });

  it('should call setLeafValue with formatted value (timestamp=false) if date is valid', async () => {
    const { formDataMethods } = await render({ component: { timeStamp: false } });

    await userEvent.type(screen.getByRole('textbox'), '31122022');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDate', newValue: '2022-12-31' });
  });

  it('should call setLeafValue with formatted value (timestamp=undefined) if date is valid', async () => {
    const { formDataMethods } = await render({ component: { timeStamp: undefined } });

    await userEvent.type(screen.getByRole('textbox'), '31122022');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'myDate',
      newValue: expect.stringContaining('2022-12-31T12:00:00.000+'),
    });
  });

  it('should call setLeafValue if date is invalid but finished filling out', async () => {
    const { formDataMethods } = await render();

    await userEvent.type(screen.getByRole('textbox'), '12345678');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDate', newValue: '12.34.5678' });
  });

  it('should call setLeafValue if not finished filling out the date', async () => {
    const { formDataMethods } = await render();

    await userEvent.type(screen.getByRole('textbox'), `1234`);

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDate', newValue: '12.34.____' });
  });

  it('should have aria-describedby if textResourceBindings.description is present', async () => {
    await render({
      component: {
        textResourceBindings: { description: 'description' },
        id: 'test-id',
      },
    });
    const inputField = screen.getByRole('textbox');
    expect(inputField).toHaveAttribute('aria-describedby', 'description-test-id');
  });

  it('should not have aria-describedby if textResources.description does not exist', async () => {
    await render({ component: { textResourceBindings: {}, id: 'test-id' } });
    const inputField = screen.getByRole('textbox');
    expect(inputField).not.toHaveAttribute('aria-describedby');
  });
});

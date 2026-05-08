import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

// Mock dateformat
jest.mock('src/app-components/Datepicker/utils/dateHelpers', () => ({
  __esModules: true,
  ...jest.requireActual<typeof import('src/app-components/Datepicker/utils/dateHelpers')>(
    'src/app-components/Datepicker/utils/dateHelpers',
  ),
  getDateFormat: jest.fn(() => 'dd.MM.yyyy'),
}));

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'Datepicker'>> = {}) =>
  await renderGenericComponentTest({
    type: 'Datepicker',
    renderer: (props) => <DatepickerComponent {...props} />,
    component: {
      minDate: '1900-01-01T12:00:00.000Z',
      maxDate: '2100-01-01T12:00:00.000Z',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'myDate' },
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

const { setScreenWidth } = mockMediaQuery(600);

// Workaround since there is no support for dialog element functions yet in jest.
const originalDialogShow = HTMLDialogElement.prototype.show;
const originalDialogShowModal = HTMLDialogElement.prototype.showModal;
const originalDialogClose = HTMLDialogElement.prototype.close;

function mockHTMLDialogElement() {
  HTMLDialogElement.prototype.show = jest.fn(function (this: HTMLDialogElement) {
    this.open = true;
  }) as unknown as typeof HTMLDialogElement.prototype.show;
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.open = true;
  }) as unknown as typeof HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.open = false;
  }) as unknown as typeof HTMLDialogElement.prototype.close;
}

describe('DatepickerComponent', () => {
  beforeEach(() => {
    setScreenWidth(1366);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    HTMLDialogElement.prototype.show = originalDialogShow;
    HTMLDialogElement.prototype.showModal = originalDialogShowModal;
    HTMLDialogElement.prototype.close = originalDialogClose;
  });

  it('should not show calendar initially, and show calendar when clicking calendar button', async () => {
    jest.spyOn(console, 'error').mockName('console.error');
    await render();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: /Åpne datovelger/i,
      }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: new Date().getDate().toString() })).toHaveAttribute(
      'data-today',
      'true',
    );
  });

  it('should not show calendar initially, and show calendar in a dialog when clicking calendar button, and screen size is mobile sized', async () => {
    mockHTMLDialogElement();
    setScreenWidth(400);
    await render();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', {
        name: /Åpne datovelger/i,
      }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: new Date().getDate().toString() })).toHaveAttribute(
      'data-today',
      'true',
    );
  });

  it('should call setLeafValue when clicking date in calendar', async () => {
    const { formDataMethods } = await render();

    await userEvent.click(
      screen.getByRole('button', {
        name: /Åpne datovelger/i,
      }),
    );
    const calendarButton = screen.getByRole('button', {
      name: /15\./i,
    });

    await userEvent.click(calendarButton);

    // Ignore TZ part of timestamp to avoid test failing when this changes
    // DatePickerCalendar opens up on current year/month by default, so we need to cater for this in the expected output
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'myDate', dataType: defaultDataTypeMock },
      newValue: expect.stringContaining(`${currentYearNumeric}-${currentMonthNumeric}`),
    });
  });

  it('should call setLeafValue if date is cleared', async () => {
    const { formDataMethods } = await render({
      queries: {
        fetchFormData: async () => ({ myDate: '2022-12-31' }),
      },
    });
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.tab();
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'myDate', dataType: defaultDataTypeMock },
      newValue: '',
    });
  });

  it('should call setLeafValue with formatted value (timestamp=true) if date is valid', async () => {
    const { formDataMethods } = await render({ component: { timeStamp: true } });

    await userEvent.type(screen.getByRole('textbox'), '31.12.2022');
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'myDate', dataType: defaultDataTypeMock },
      newValue: expect.stringContaining('2022-12-31T00:00:00'),
    });
  });

  it('should call setLeafValue with formatted value (timestamp=false) if date is valid', async () => {
    const { formDataMethods } = await render({ component: { timeStamp: false } });

    await userEvent.type(screen.getByRole('textbox'), '31.12.2022');
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'myDate', dataType: defaultDataTypeMock },
      newValue: '2022-12-31',
    });
  });

  it('should call setLeafValue with formatted value (timestamp=undefined) if date is valid', async () => {
    const { formDataMethods } = await render({ component: { timeStamp: undefined } });

    await userEvent.type(screen.getByRole('textbox'), '31.12.2022');
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'myDate', dataType: defaultDataTypeMock },
      newValue: expect.stringContaining('2022-12-31T00:00:00'),
    });
  });

  it('should call setLeafValue if date is invalid but finished filling out', async () => {
    const { formDataMethods } = await render();

    await userEvent.type(screen.getByRole('textbox'), '12.34.5678');
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'myDate', dataType: defaultDataTypeMock },
      newValue: '12.34.5678',
    });
  });

  it('should call setLeafValue if not finished filling out the date', async () => {
    const { formDataMethods } = await render();

    await userEvent.type(screen.getByRole('textbox'), `1234`);
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'myDate', dataType: defaultDataTypeMock },
      newValue: '12.34.____',
    });
  });

  it('should not have aria-describedby if textResources.description does not exist', async () => {
    await render({ component: { textResourceBindings: {}, id: 'test-id' } });
    const inputField = screen.getByRole('textbox');
    expect(inputField).not.toHaveAttribute('aria-describedby');
  });

  it('should not display years outside of min and max date range in year dropdown', async () => {
    const user = userEvent.setup();
    const currentYear = new Date().getFullYear();
    const minDate = new Date(Date.UTC(currentYear - 1, 0, 1));
    const maxDate = new Date(Date.UTC(currentYear + 1, 11, 31));
    await render({
      component: {
        minDate: minDate.toISOString(),
        maxDate: maxDate.toISOString(),
      },
    });
    await user.click(screen.getByRole('button', { name: /Åpne datovelger/i }));
    await user.click(screen.getByRole('combobox', { name: /Velg år/i }));

    expect(screen.queryByRole('option', { name: (currentYear - 2).toString() })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: (currentYear + 2).toString() })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: currentYear.toString() })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: (currentYear - 1).toString() })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: (currentYear + 1).toString() })).toBeInTheDocument();
  });

  it('should show close button in mobile screen and close modal when clicked', async () => {
    mockHTMLDialogElement();
    setScreenWidth(400);
    await render();

    await userEvent.click(screen.getByRole('button', { name: /Åpne datovelger/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Lukk/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('close button is not shown on desktop at normal zoom', async () => {
    await render();

    await userEvent.click(screen.getByRole('button', { name: /Åpne datovelger/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Lukk/i })).not.toBeInTheDocument();
  });

  it('should disable previous month button if previous month is before minDate', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const minDate = new Date(today.getFullYear(), today.getMonth(), 1);

    await render({
      component: {
        minDate: minDate.toISOString(),
      },
    });
    await user.click(screen.getByRole('button', { name: /Åpne datovelger/i }));
    const prevButton = screen.getByRole('button', { name: /forrige måned/i });
    expect(prevButton).toBeDisabled();
  });

  it('should disable next month button if next month is after maxDate', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    await render({
      component: {
        maxDate: maxDate.toISOString(),
      },
    });
    await user.click(screen.getByRole('button', { name: /Åpne datovelger/i }));
    const nextButton = screen.getByRole('button', { name: /neste måned/i });
    expect(nextButton).toBeDisabled();
  });
});

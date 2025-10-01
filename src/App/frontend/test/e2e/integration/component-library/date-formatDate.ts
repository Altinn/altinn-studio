import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

const Rows = {
  Raw: { type: 'Text', backend: false, raw: true },
  Date: { type: 'Date', backend: false, raw: false },
  FormatDate: { type: 'TextFormat', backend: false, raw: false },
  FormatDateBackend: { type: 'TextFormat', backend: true, raw: false },
  DatePicker: { type: 'DatePicker', backend: false, raw: false },
};

const Cols = {
  String: { type: 'String' },
  DateTime: { type: 'DateTime' },
  DateOnly: { type: 'DateOnly' },
};

type Row = (typeof Rows)[keyof typeof Rows];
type Col = (typeof Cols)[keyof typeof Cols];

function id(row: Row, col: Col) {
  const baseId = `dates-${row.type}-${col.type}`;
  if (row.backend) {
    return `${baseId}-Backend`;
  }
  return baseId;
}

const tzNewYork = 'America/New_York' as const;
const tzOslo = 'Europe/Oslo' as const;
const tzUtc = 'UTC' as const;
const browserTimezones = [tzNewYork, tzOslo] as const;

type ValidTimezones = typeof tzNewYork | typeof tzOslo | typeof tzUtc;
type TZ = { browser: ValidTimezones; backend: ValidTimezones };

type Test = {
  [key in keyof typeof Rows]: {
    [key in keyof typeof Cols]: string;
  };
};

function testAll(test: Test) {
  cy.get(`#form-content-${id(Rows.Raw, Cols.String)}`).should('have.text', test.Raw.String);
  cy.get(`#form-content-${id(Rows.Raw, Cols.DateTime)}`).should('have.text', test.Raw.DateTime);
  cy.get(`#form-content-${id(Rows.Raw, Cols.DateOnly)}`).should('have.text', test.Raw.DateOnly);
  cy.get(`#form-content-${id(Rows.Date, Cols.String)}`).should('have.text', test.Date.String);
  cy.get(`#form-content-${id(Rows.Date, Cols.DateTime)}`).should('have.text', test.Date.DateTime);
  cy.get(`#form-content-${id(Rows.Date, Cols.DateOnly)}`).should('have.text', test.Date.DateOnly);
  cy.get(`#form-content-${id(Rows.FormatDate, Cols.String)}`).should('have.text', test.FormatDate.String);
  cy.get(`#form-content-${id(Rows.FormatDate, Cols.DateTime)}`).should('have.text', test.FormatDate.DateTime);
  cy.get(`#form-content-${id(Rows.FormatDate, Cols.DateOnly)}`).should('have.text', test.FormatDate.DateOnly);
  cy.get(`#form-content-${id(Rows.FormatDateBackend, Cols.String)}`).should('have.text', test.FormatDateBackend.String);
  cy.get(`#form-content-${id(Rows.FormatDateBackend, Cols.DateTime)}`).should(
    'have.text',
    test.FormatDateBackend.DateTime,
  );
  cy.get(`#form-content-${id(Rows.FormatDateBackend, Cols.DateOnly)}`).should(
    'have.text',
    test.FormatDateBackend.DateOnly,
  );
  cy.get(`#${id(Rows.DatePicker, Cols.String)}`).should('have.value', test.DatePicker.String);
  cy.get(`#${id(Rows.DatePicker, Cols.DateTime)}`).should('have.value', test.DatePicker.DateTime);
  cy.get(`#${id(Rows.DatePicker, Cols.DateOnly)}`).should('have.value', test.DatePicker.DateOnly);
}

describe('Date component and formatDate expression', () => {
  Cypress.on('test:before:run', (test) => {
    const timezoneId = test.title.replace('Should work in ', '');
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setTimezoneOverride',
      params: { timezoneId },
    });
  });
  Cypress.on('test:after:run', () => {
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setTimezoneOverride',
      params: { timezoneId: '' }, // Reset to default
    });
  });

  browserTimezones.forEach((tz) => {
    it(`Should work in ${tz}`, () => {
      cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
      cy.gotoNavPage('DateAndFormatDate');

      const timezone: TZ = {
        browser: tz,
        backend: Cypress.env('type') === 'localtest' ? tzOslo : tzUtc,
      };

      testEmpty();
      testLeapYearDay();
      testCloseTo2022();
      midnightOtherTz(timezone);
      midnightUtc(timezone);
    });
  });
});

/**
 * When we load the page, the date/time will be null, and form-content should be empty
 */
function testEmpty() {
  testAll({
    Raw: { String: '', DateTime: '', DateOnly: '' },
    Date: { String: '', DateTime: '', DateOnly: '' },
    FormatDate: { String: '', DateTime: '', DateOnly: '' },
    FormatDateBackend: { String: '', DateTime: '', DateOnly: '' },
    DatePicker: { String: '', DateTime: '', DateOnly: '' },
  });
}

/**
 * This works the same in all timezones, as the raw timestamp has no timezone info, so it's assumed to be
 * in the local timezone of the browser (and on backend). Thus input === output.
 */
function testLeapYearDay() {
  cy.dsSelect('#datesDate', 'Skuddårsdagen 2020');

  const rawString = '2020-02-29 12:00:00';
  const rawDateTime = '2020-02-29T12:00:00';
  const rawDateOnly = '2020-02-29';

  const local = '29.02.2020 12:00:00';
  const zeroed = '29.02.2020 00:00:00';
  const inDatepicker = '29.02.2020';

  testAll({
    Raw: { String: rawString, DateTime: rawDateTime, DateOnly: rawDateOnly },
    Date: { String: local, DateTime: local, DateOnly: zeroed },
    FormatDate: { String: local, DateTime: local, DateOnly: zeroed },
    FormatDateBackend: { String: local, DateTime: local, DateOnly: zeroed },
    DatePicker: { String: inDatepicker, DateTime: inDatepicker, DateOnly: inDatepicker },
  });
}

/**
 * This demonstrates a bug that affects the date parsing in the frontend, but not the backend.
 */
function testCloseTo2022() {
  cy.dsSelect('#datesDate', 'Veldig tett på 2022');

  const rawString = '2021-12-31 23:59:59.9999999';
  const rawDateTime = '2021-12-31T23:59:59.9999999';
  const rawDateOnly = '2021-12-31';

  const local = '31.12.2021 23:59:59';
  const zeroed = '31.12.2021 00:00:00';
  const inDatepicker = '31.12.2021';

  const buggy = '01.01.2022 00:00:00'; /** @see exprParseDate */
  const buggyDatepicker = '01.01.2022';

  testAll({
    Raw: { String: rawString, DateTime: rawDateTime, DateOnly: rawDateOnly },
    Date: { String: buggy, DateTime: buggy, DateOnly: zeroed },
    FormatDate: { String: buggy, DateTime: buggy, DateOnly: zeroed },
    FormatDateBackend: { String: local, DateTime: local, DateOnly: zeroed },
    DatePicker: { String: buggyDatepicker, DateTime: buggyDatepicker, DateOnly: inDatepicker },
  });
}

/**
 * At this point the browser timezone starts to matter, because the date/time has specified a timezone. Thus
 * it needs to be converted to the local timezone before being displayed.
 */
function midnightOtherTz(tz: TZ) {
  cy.dsSelect('#datesDate', 'Midnatt i en annen tidssone');

  const rawString = '2020-05-17 00:00:00-08:00';
  const rawDateTime = tz.backend === tzOslo ? '2020-05-17T10:00:00+02:00' : '2020-05-17T08:00:00+00:00';
  const rawDateOnly = '2020-05-17';

  const zeroed = '17.05.2020 00:00:00';

  // Backend local time is Europe/Oslo, so the date will be converted to that timezone
  const inOslo = '17.05.2020 10:00:00';
  const inUtc = '17.05.2020 08:00:00';
  const beLocal = tz.backend === tzOslo ? inOslo : inUtc;

  const date = '17.05.2020';
  const dependsOnTimezone = tz.browser === tzNewYork ? '17.05.2020 04:00:00' : inOslo;

  testAll({
    Raw: { String: rawString, DateTime: rawDateTime, DateOnly: rawDateOnly },
    Date: { String: dependsOnTimezone, DateTime: dependsOnTimezone, DateOnly: zeroed },
    FormatDate: { String: dependsOnTimezone, DateTime: dependsOnTimezone, DateOnly: zeroed },
    FormatDateBackend: { String: beLocal, DateTime: beLocal, DateOnly: zeroed },
    DatePicker: { String: date, DateTime: date, DateOnly: date },
  });
}

function midnightUtc(tz: TZ) {
  cy.dsSelect('#datesDate', 'Midnatt i UTC');

  const rawString = '2020-05-17T00:00:00Z';
  const rawDateTime = tz.backend === tzOslo ? '2020-05-17T02:00:00+02:00' : '2020-05-17T00:00:00+00:00';
  const rawDateOnly = '2020-05-17';

  const date = '17.05.2020';
  const zeroed = '17.05.2020 00:00:00';

  const utcInOslo = '17.05.2020 02:00:00';
  const beLocal = tz.backend === tzOslo ? utcInOslo : zeroed;

  const utcInBrowser = tz.browser === tzNewYork ? '16.05.2020 20:00:00' : utcInOslo;
  const dateInUtc = tz.browser === tzNewYork ? '16.05.2020' : date;

  testAll({
    Raw: { String: rawString, DateTime: rawDateTime, DateOnly: rawDateOnly },
    Date: { String: utcInBrowser, DateTime: utcInBrowser, DateOnly: zeroed },
    FormatDate: { String: utcInBrowser, DateTime: utcInBrowser, DateOnly: zeroed },
    FormatDateBackend: { String: beLocal, DateTime: beLocal, DateOnly: zeroed },
    DatePicker: { String: dateInUtc, DateTime: dateInUtc, DateOnly: date },
  });
}

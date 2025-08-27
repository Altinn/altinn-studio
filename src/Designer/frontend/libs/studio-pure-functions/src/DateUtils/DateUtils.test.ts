import { DateUtils } from './DateUtils';

test('that formatTimeHHmm works', () => {
  const formatted = DateUtils.formatTimeHHmm(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    'Europe/Oslo',
  );
  const [HH, mm] = formatted.split(':');
  expect(HH).toBe('13');
  expect(mm).toBe('23');
});

test('that formatDateDDMMYY works', () => {
  const formatted = DateUtils.formatDateDDMMYYYY(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    'Europe/Oslo',
  );
  const [DD, MM, YY] = formatted.split('.');
  expect(DD).toBe('10');
  expect(MM).toBe('01');
  expect(YY).toBe('2023');
});

test('that formatDateTime works', () => {
  const formatted = DateUtils.formatDateTime(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    'Europe/Oslo',
  );
  expect(formatted).toBe('10.01.2023 13:23');
});

test('that isDateWithinSeconds works', () => {
  const oldDate = DateUtils.isDateWithinSeconds(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    10,
  );
  expect(oldDate).toBe(false);
  const newDate = DateUtils.isDateWithinSeconds(new Date().toISOString(), 36000);
  expect(newDate).toBe(true);
});

test('that isDateWithinDays works', () => {
  const oldDate = DateUtils.isDateWithinDays(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    10,
  );
  expect(oldDate).toBe(false);
  const newDate = DateUtils.isDateWithinDays(new Date().toISOString(), 10);
  expect(newDate).toBe(true);
});

test('that addMinutesToTime works', () => {
  const formatted = DateUtils.addMinutesToTime(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    30,
  );
  expect(DateUtils.formatDateTime(formatted.toString(), 'Europe/Oslo')).toBe('10.01.2023 13:53');
});

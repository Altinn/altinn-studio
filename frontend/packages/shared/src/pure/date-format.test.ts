import {
  formatDateDDMMYY,
  formatDateTime,
  formatTimeHHmm,
  addMinutesToTime,
} from 'app-shared/pure/date-format';

test('that formatTimeHHmm works', () => {
  const formatted = formatTimeHHmm(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    'Europe/Oslo'
  );
  const [HH, mm] = formatted.split(':');
  expect(HH).toBe('13');
  expect(mm).toBe('23');
});

test('that formatDateDDMMYY works', () => {
  const formatted = formatDateDDMMYY(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    'Europe/Oslo'
  );
  const [DD, MM, YY] = formatted.split('.');
  expect(DD).toBe('10');
  expect(MM).toBe('01');
  expect(YY).toBe('2023');
});

test('that formatDateTime works', () => {
  const formatted = formatDateTime(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    'Europe/Oslo'
  );
  expect(formatted).toBe('10.01.2023 13:23');
});

test('that addMinutesToTime works', () => {
  const formatted = addMinutesToTime(
    'Tue Jan 10 2023 13:23:45 GMT+0100 (Central European Standard Time)',
    30
  );
  expect(formatDateTime(formatted.toString(), 'Europe/Oslo')).toBe('10.01.2023 13:53');
});

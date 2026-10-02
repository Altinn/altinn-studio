import { formatDateAndTime } from './formatDateAndTime';

describe('formatDateAndTime', () => {
  it('formats a parseable timestamp as a Norwegian date and time', () => {
    expect(formatDateAndTime('2026-08-02T10:04:00Z')).toMatch(/^\d{2}\.\d{2}\.2026, \d{2}:\d{2}$/);
  });

  it('shows a missing timestamp as a dash', () => {
    expect(formatDateAndTime(undefined)).toBe('-');
    expect(formatDateAndTime(null)).toBe('-');
    expect(formatDateAndTime('')).toBe('-');
  });

  it('shows an unparseable timestamp as it came rather than throwing', () => {
    expect(formatDateAndTime('not a date')).toBe('not a date');
  });
});

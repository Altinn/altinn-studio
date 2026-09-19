import { formatTimestamp } from './formatTimestamp';

describe('formatTimestamp', () => {
  // The hour depends on the machine's time zone; the seconds and the fraction do not.
  it('reads to the second by default, and to the millisecond on request', () => {
    expect(formatTimestamp('2026-08-02T10:05:07.123Z')).toMatch(
      /^\d{2}\.\d{2}\.2026, \d{2}:05:07$/,
    );
    expect(formatTimestamp('2026-08-02T10:05:07.123Z', 'milliseconds')).toMatch(
      /^\d{2}\.\d{2}\.2026, \d{2}:05:07,123$/,
    );
  });

  it('shows a missing timestamp as a dash and an unparsable one as it came', () => {
    expect(formatTimestamp(undefined)).toBe('-');
    expect(formatTimestamp(null)).toBe('-');
    expect(formatTimestamp('yesterday-ish')).toBe('yesterday-ish');
  });
});

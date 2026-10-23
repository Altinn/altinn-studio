import { describe, expect, it } from 'vitest';
import {
  MAX_INACTIVITY_PERIOD_DAYS,
  MIN_INACTIVITY_PERIOD_DAYS,
  parseInactivityPeriodDays,
} from './inactivityPeriodUtils';

describe('parseInactivityPeriodDays', () => {
  it.each([
    [String(MIN_INACTIVITY_PERIOD_DAYS), MIN_INACTIVITY_PERIOD_DAYS],
    ['30', 30],
    [' 45 ', 45],
    [String(MAX_INACTIVITY_PERIOD_DAYS), MAX_INACTIVITY_PERIOD_DAYS],
  ])('returns the number of days for %j', (value, expected) => {
    expect(parseInactivityPeriodDays(value)).toBe(expected);
  });

  it.each([
    '',
    String(MIN_INACTIVITY_PERIOD_DAYS - 1),
    String(MAX_INACTIVITY_PERIOD_DAYS + 1),
    '14.5',
    '-30',
    'abc',
  ])('returns null for %j', (value) => {
    expect(parseInactivityPeriodDays(value)).toBeNull();
  });
});

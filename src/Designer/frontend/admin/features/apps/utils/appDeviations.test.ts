import { describe, expect, it } from 'vitest';
import { formatTypicalTime, noUseMonths, percentChange, percentOf } from './appDeviations';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('noUseMonths', () => {
  it('counts whole months since the last instance when it is more than 90 days ago', () => {
    expect(noUseMonths('2026-04-03', '2026-10-01', '2026-11-10')).toBe(7);
  });

  it('is 0 when an instance was created within 90 days', () => {
    expect(noUseMonths('2026-09-01', '2026-10-01', '2026-11-10')).toBe(0);
  });

  it('counts from the first stored day when no instance was ever stored', () => {
    expect(noUseMonths(null, '2026-05-01', '2026-11-10')).toBe(6);
    expect(noUseMonths(null, '2026-10-01', '2026-11-10')).toBe(0);
  });

  it('is 0 without stored history', () => {
    expect(noUseMonths(null, null, '2026-11-10')).toBe(0);
    expect(noUseMonths('2026-01-01', '2026-01-01', null)).toBe(0);
  });
});

describe('formatTypicalTime', () => {
  it('formats seconds as the two largest units', () => {
    expect(formatTypicalTime(660, textMock)).toBe(
      textMock('admin.workflows.duration.minutes', { count: 11 }),
    );
    expect(formatTypicalTime(93_600, textMock)).toBe(
      `${textMock('admin.workflows.duration.days', { count: 1 })} ${textMock('admin.workflows.duration.hours', { count: 2 })}`,
    );
  });

  it('is null when nothing completed', () => {
    expect(formatTypicalTime(null, textMock)).toBeNull();
  });
});

describe('percentChange and percentOf', () => {
  it('rounds to whole percent', () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentOf(1, 3)).toBe(33);
  });

  it('is null without a previous period or denominator', () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentOf(5, 0)).toBeNull();
  });
});

import { textMock } from '@studio/testing/mocks/i18nMock';
import { formatDuration } from './formatDuration';

const seconds = (count: number) => textMock('admin.workflows.duration.seconds', { count });
const minutes = (count: number) => textMock('admin.workflows.duration.minutes', { count });
const hours = (count: number) => textMock('admin.workflows.duration.hours', { count });
const days = (count: number) => textMock('admin.workflows.duration.days', { count });

describe('formatDuration', () => {
  it('reads anything under a second, and a negative span, as zero seconds', () => {
    expect(formatDuration(999, textMock)).toBe(seconds(0));
    expect(formatDuration(-5_000, textMock)).toBe(seconds(0));
  });

  it('shows the two largest units that are not zero', () => {
    expect(formatDuration(12_000, textMock)).toBe(seconds(12));
    expect(formatDuration(65_000, textMock)).toBe(`${minutes(1)} ${seconds(5)}`);
    expect(formatDuration(3_600_000 + 5 * 60_000 + 4_000, textMock)).toBe(
      `${hours(1)} ${minutes(5)}`,
    );
    expect(formatDuration(2 * 24 * 3_600_000, textMock)).toBe(days(2));
  });
});

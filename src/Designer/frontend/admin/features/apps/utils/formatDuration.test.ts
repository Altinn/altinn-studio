import { textMock } from '@studio/testing/mocks/i18nMock';
import { formatDuration, formatElapsed } from './formatDuration';

const seconds = (count: number) => textMock('admin.workflows.duration.seconds', { count });
const minutes = (count: number) => textMock('admin.workflows.duration.minutes', { count });
const hours = (count: number) => textMock('admin.workflows.duration.hours', { count });
const days = (count: number) => textMock('admin.workflows.duration.days', { count });
const milliseconds = (count: number) =>
  textMock('admin.workflows.duration.milliseconds', { count });

describe('formatDuration', () => {
  it('says a real span under a second is under a second, and a missing one is zero', () => {
    expect(formatDuration(999, textMock)).toBe(textMock('admin.workflows.duration.under_second'));
    expect(formatDuration(0, textMock)).toBe(seconds(0));
    expect(formatDuration(-5_000, textMock)).toBe(seconds(0));
  });

  it('gives finished work under a second in milliseconds, and longer work as usual', () => {
    expect(formatElapsed(286.4, textMock)).toBe(milliseconds(286));
    expect(formatElapsed(0, textMock)).toBe(milliseconds(0));
    expect(formatElapsed(65_000, textMock)).toBe(`${minutes(1)} ${seconds(5)}`);
  });

  it('keeps the milliseconds under a minute, and drops them from there', () => {
    expect(formatElapsed(1_206.4, textMock)).toBe(`${seconds(1)} ${milliseconds(206)}`);
    expect(formatElapsed(13_870, textMock)).toBe(`${seconds(13)} ${milliseconds(870)}`);
    expect(formatElapsed(999.6, textMock)).toBe(seconds(1));
    expect(formatElapsed(59_999.4, textMock)).toBe(`${seconds(59)} ${milliseconds(999)}`);
    expect(formatElapsed(65_400, textMock)).toBe(`${minutes(1)} ${seconds(5)}`);
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

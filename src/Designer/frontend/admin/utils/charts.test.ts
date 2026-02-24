import type { TimeScaleOptions } from 'chart.js';
import { formatTooltipTitle, getChartOptions } from './charts';

describe('getChartOptions', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets min and max based on bucket size and range', () => {
    const options = getChartOptions(5, 60);
    const xScale = options.scales?.x as TimeScaleOptions;
    expect(xScale?.min).toBe(1_699_996_200_000);
    expect(xScale?.max).toBe(1_700_000_100_000);
  });
});

describe('formatTooltipTitle', () => {
  const bucketSizeInMs = 60 * 60 * 1000; // 60 minutes

  it('returns a single date header and time range when bucket is within the same day', () => {
    const startMs = new Date('2023-11-14T12:00:00').getTime();
    const [dateHeader, timeRange] = formatTooltipTitle(startMs, bucketSizeInMs);
    expect(dateHeader).not.toContain('–');
    expect(timeRange).toMatch(/\d{2}:\d{2} – \d{2}:\d{2}/);
  });

  it('returns two date headers when bucket spans midnight', () => {
    const startMs = new Date('2023-11-14T23:30:00').getTime();
    const [dateHeader, timeRange] = formatTooltipTitle(startMs, bucketSizeInMs);
    expect(dateHeader).toContain('–');
    expect(timeRange).toMatch(/\d{2}:\d{2} – \d{2}:\d{2}/);
  });
});

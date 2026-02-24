import type { TimeScaleOptions, TooltipCallbacks } from 'chart.js';
import { getChartOptions } from './charts';

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

  describe('tooltip title', () => {
    const getTitle = (bucketSize: number, startMs: number): string[] => {
      const options = getChartOptions(bucketSize, 60);
      const title = options.plugins?.tooltip?.callbacks?.title;
      return title?.call({} as TooltipCallbacks<'bar'>, [{ parsed: { x: startMs } }]) as string[];
    };

    it('returns date header and time range on same day', () => {
      const startMs = new Date('2023-11-14T12:00:00').getTime();
      const [dateHeader, timeRange] = getTitle(60, startMs);
      expect(dateHeader).toContain('2023');
      expect(timeRange).toMatch(/\d{2}:\d{2} – \d{2}:\d{2}/);
    });

    it('returns two date headers when bucket spans multiple days', () => {
      const startMs = new Date('2023-11-14T23:30:00').getTime();
      const [dateHeader, timeRange] = getTitle(60, startMs);
      expect(dateHeader).toContain('–');
      expect(timeRange).toMatch(/\d{2}:\d{2} – \d{2}:\d{2}/);
    });

    it('returns empty string when no items', () => {
      const options = getChartOptions(5, 60);
      const title = options.plugins?.tooltip?.callbacks?.title;
      const result = title?.call({} as TooltipCallbacks<'bar'>, []);
      expect(result).toBe(undefined);
    });
  });
});

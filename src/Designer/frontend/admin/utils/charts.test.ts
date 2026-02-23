import type { TimeScaleOptions } from 'chart.js';
import { getChartOptions, getChartData } from './charts';

describe('getChartOptions', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets min and max based on interval and range', () => {
    const intervalInMinutes = 5;
    const rangeInMinutes = 60;
    const options = getChartOptions(intervalInMinutes, rangeInMinutes);

    const xScale = options.scales?.x as TimeScaleOptions;

    const minuteInMs = 60 * 1000;
    const intervalInMs = intervalInMinutes * minuteInMs;
    const rangeInMs = rangeInMinutes * minuteInMs;
    const now = 1_700_000_000_000;
    const expectedMax = Math.ceil(now / intervalInMs) * intervalInMs;
    const expectedMin = Math.floor((now - rangeInMs) / intervalInMs) * intervalInMs;

    expect(xScale?.min).toBe(expectedMin);
    expect(xScale?.max).toBe(expectedMax);
  });

  it('sets tooltipFormat and displayFormats', () => {
    const options = getChartOptions(5, 60);

    const xScale = options.scales?.x as TimeScaleOptions;

    expect(xScale?.time?.tooltipFormat).toBe('dd.MM.yyyy HH:mm');
    expect(xScale?.time?.displayFormats).toEqual({
      minute: 'HH:mm',
      hour: 'HH:mm',
      day: 'dd.MM',
    });
  });
});

describe('getChartData', () => {
  const timestamps = [1_700_000_000_000, 1_700_000_060_000];
  const counts = [5, 8];

  it('maps labels from timestamps', () => {
    const chartData = getChartData(timestamps, counts, {});

    expect(chartData.labels).toEqual(timestamps);
  });

  it('maps dataset data from counts', () => {
    const chartData = getChartData(timestamps, counts, {});

    expect(chartData.datasets[0].data).toEqual(counts);
  });

  it('applies dataset options overrides', () => {
    const chartData = getChartData(timestamps, counts, {
      borderColor: 'red',
      label: 'Test Dataset',
    });

    expect(chartData.datasets[0].borderColor).toBe('red');
    expect(chartData.datasets[0].label).toBe('Test Dataset');
  });
});

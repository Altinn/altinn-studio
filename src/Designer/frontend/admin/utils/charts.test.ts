import type { TimeScaleOptions } from 'chart.js';
import { getChartOptions, getChartData } from './charts';

describe('getChartOptions', () => {
  it('uses minute unit when range is below threshold', () => {
    const options = getChartOptions(100);

    const xScale = options.scales?.x as TimeScaleOptions;

    expect(xScale?.time?.unit).toBe('minute');
  });

  it('uses hour unit when range is equal or above threshold', () => {
    const options = getChartOptions(1140);

    const xScale = options.scales?.x as TimeScaleOptions;

    expect(xScale?.time?.unit).toBe('hour');
  });
});

describe('getChartData', () => {
  const dataPoints = [
    {
      dateTimeOffset: '2023-01-01T10:00:00Z',
      count: 5,
    },
    {
      dateTimeOffset: '2023-01-01T10:01:00Z',
      count: 8,
    },
  ];

  it('maps labels from dateTimeOffset', () => {
    const chartData = getChartData(dataPoints, {});

    expect(chartData.labels).toEqual(['2023-01-01T10:00:00Z', '2023-01-01T10:01:00Z']);
  });

  it('maps dataset data from count', () => {
    const chartData = getChartData(dataPoints, {});

    expect(chartData.datasets[0].data).toEqual([5, 8]);
  });

  it('applies dataset options overrides', () => {
    const chartData = getChartData(dataPoints, {
      borderColor: 'red',
      label: 'Test Dataset',
    });

    expect(chartData.datasets[0].borderColor).toBe('red');
    expect(chartData.datasets[0].label).toBe('Test Dataset');
  });
});

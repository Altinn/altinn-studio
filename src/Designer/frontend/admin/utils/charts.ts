import type { AppMetricDataPoint } from 'admin/types/metrics/AppMetricDataPoint';
import type { ChartDataset, ChartOptions } from 'chart.js';

export const getChartOptions = (range: number): ChartOptions<'line'> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: {
        font: {
          size: 10,
        },
      },
      type: 'time',
      time: {
        unit: range >= 1140 ? 'hour' : 'minute',
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        font: {
          size: 10,
        },
      },
    },
  },
});

export const getChartData = (
  dataPoints: AppMetricDataPoint[],
  options: Partial<ChartDataset<'line'>>,
) => {
  return {
    labels: dataPoints?.map((dataPoint) => dataPoint.dateTimeOffset),
    datasets: [
      {
        fill: true,
        data: dataPoints?.map((dataPoint) => dataPoint.count),
        borderWidth: 2,
        pointRadius: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        ...options,
      },
    ],
  };
};

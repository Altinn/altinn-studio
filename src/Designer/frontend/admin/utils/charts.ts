import type { ChartDataset, ChartOptions } from 'chart.js';
import { nb } from 'date-fns/locale';

export const getChartOptions = (
  intervalInMinutes: number,
  rangeInMinutes: number,
): ChartOptions<'bar'> => {
  const minuteInMs = 60 * 1000;
  const intervalInMs = intervalInMinutes * minuteInMs;
  const rangeInMs = rangeInMinutes * minuteInMs;
  const now = Date.now();
  const max = Math.ceil(now / intervalInMs) * intervalInMs;
  const min = Math.floor((now - rangeInMs) / intervalInMs) * intervalInMs;
  return {
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
        min: min,
        max: max,
        adapters: {
          date: {
            locale: nb,
          },
        },
        time: {
          tooltipFormat: 'dd.MM.yyyy HH:mm',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'dd.MM',
          },
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
        adapters: {
          date: {
            locale: nb,
          },
        },
      },
    },
  };
};

export const getChartData = (
  timestamps: number[],
  counts: number[],
  options: Partial<ChartDataset<'bar'>>,
) => {
  return {
    labels: timestamps,
    datasets: [
      {
        data: counts,
        borderWidth: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        ...options,
      },
    ],
  };
};

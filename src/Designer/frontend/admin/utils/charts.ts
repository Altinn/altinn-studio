import type { ChartDataset, ChartOptions } from 'chart.js';

export const getChartOptions = (range: number): ChartOptions<'bar'> => {
  const intervalMs = (range / 12) * 60 * 1000;
  const max = Math.floor(Date.now() / intervalMs) * intervalMs;
  const min = max - range * 60 * 1000;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (items) => {
            return new Date(items[0].parsed.x).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          },
        },
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

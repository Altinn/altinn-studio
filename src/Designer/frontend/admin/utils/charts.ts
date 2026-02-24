import type { ChartOptions } from 'chart.js';
import { nb } from 'date-fns/locale';

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });

const formatDate = (date: Date): string =>
  date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

const isSameDay = (startDate: Date, endDate: Date): boolean =>
  startDate.getFullYear() === endDate.getFullYear() &&
  startDate.getMonth() === endDate.getMonth() &&
  startDate.getDate() === endDate.getDate();

export const formatTooltipTitle = (startMs: number, bucketSizeInMs: number): string[] => {
  const startDate = new Date(startMs);
  const endDate = new Date(startMs + bucketSizeInMs);
  const dateHeader = isSameDay(startDate, endDate)
    ? formatDate(startDate)
    : `${formatDate(startDate)} – ${formatDate(endDate)}`;
  return [dateHeader, `${formatTime(startDate)} – ${formatTime(endDate)}`];
};

export const getChartOptions = (bucketSize: number, range: number): ChartOptions<'bar'> => {
  const minuteInMs = 60 * 1000;
  const bucketSizeInMs = bucketSize * minuteInMs;
  const rangeInMs = range * minuteInMs;
  const now = Date.now();
  const max = Math.ceil(now / bucketSizeInMs) * bucketSizeInMs;
  const min = Math.floor((now - rangeInMs) / bucketSizeInMs) * bucketSizeInMs;
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
            if (!items.length) return;
            return formatTooltipTitle(items[0].parsed.x, bucketSizeInMs);
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
        adapters: {
          date: {
            locale: nb,
          },
        },
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'dd.M',
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
      },
    },
  };
};

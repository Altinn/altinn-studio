import type { AppMetricDataPoint } from 'admin/types/metrics/AppMetricDataPoint';
import type { ChartDataset, ChartOptions } from 'chart.js';

const MINUTES_IN_MS = 60_000;

const inferStepMinutes = (dataPoints: AppMetricDataPoint[], range: number): number => {
  if (dataPoints.length >= 2) {
    const diff =
      (new Date(dataPoints[1].dateTimeOffset).getTime() -
        new Date(dataPoints[0].dateTimeOffset).getTime()) /
      MINUTES_IN_MS;
    if (diff > 0) return diff;
  }
  return range >= 1440 ? 60 : 1;
};

export const fillMissingDataPoints = (
  dataPoints: AppMetricDataPoint[],
  range: number,
): AppMetricDataPoint[] => {
  const stepMs = inferStepMinutes(dataPoints, range) * MINUTES_IN_MS;
  const now = Date.now();
  const start = now - range * MINUTES_IN_MS;

  const existing = new Map(
    dataPoints.map((p) => [
      Math.round(new Date(p.dateTimeOffset).getTime() / stepMs) * stepMs,
      p.count,
    ]),
  );

  const result: AppMetricDataPoint[] = [];
  for (let t = Math.ceil(start / stepMs) * stepMs; t <= now + stepMs; t += stepMs) {
    result.push({
      dateTimeOffset: new Date(t).toISOString(),
      count: existing.get(t) ?? 0,
    });
  }
  return result;
};

export const getChartOptions = (range: number): ChartOptions<'bar'> => ({
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
  options: Partial<ChartDataset<'bar'>>,
) => {
  return {
    labels: dataPoints?.map((dataPoint) => dataPoint.dateTimeOffset),
    datasets: [
      {
        data: dataPoints?.map((dataPoint) => dataPoint.count),
        borderWidth: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        ...options,
      },
    ],
  };
};

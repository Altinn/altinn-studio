import React from 'react';
import classes from './AppMetric.module.css';
import { useTranslation } from 'react-i18next';
import type { AppMetricDataPoint } from 'admin/types/metrics/AppMetricDataPoint';
import type { AppMetric as Metric } from 'admin/types/metrics/AppMetric';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
} from 'chart.js';
import cn from 'classnames';

import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
);

const getChartOptions = (range: number) => ({
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
          color: '#ddd',
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
          color: '#ddd',
          size: 10,
        },
      },
    },
  },
});
const getChartData = (dataPoints: AppMetricDataPoint[], options) => {
  return {
    labels: dataPoints?.map((dataPoint) => dataPoint.dateTimeOffset),
    datasets: [
      {
        fill: true,
        data: dataPoints?.map((dataPoint) => dataPoint.count),
        borderWidth: 2,
        pointRadius: 0,
        ...options,
      },
    ],
  };
};

const COLORS = [
  'rgb(54, 162, 235)',
  //'rgb(255, 99, 132)',
  'rgb(255, 159, 64)',
  'rgb(255, 205, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  //'rgb(201, 203, 207)',
];

const getRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * COLORS.length);
  const color = COLORS[randomIndex];
  return {
    borderColor: color,
    color: '#fff',
    backgroundColor: color.replace('rgb(', 'rgba(').replace(')', ', 0.7)'),
  };
};

type AppMetricProps = {
  range: number;
  metric: Metric;
};

export const AppMetric = ({ range, metric }: AppMetricProps) => {
  const { t } = useTranslation();
  const options = getChartOptions(range);
  const count = metric.dataPoints.reduce((sum, item) => sum + item.count, 0);
  const isErrorMetric = metric.name.startsWith('failed_');
  const isError = isErrorMetric && count > 0;

  const color = getRandomColor();
  const metricsChartData = getChartData(
    metric.dataPoints,
    isErrorMetric
      ? {
          borderColor: isError ? 'rgba(206, 77, 77)' : 'rgb(16, 140, 34)',
          backgroundColor: isError ? 'rgba(206, 77, 77, 0.7)' : 'rgba(16, 140, 34, 0.7)',
        }
      : color,
  );

  var customStyle = isErrorMetric
    ? {}
    : {
        backgroundColor: color.backgroundColor,
        color: color.color,
        opacity: 1,
      };

  return (
    <div key={metric.name}>
      <div className={classes.title}>
        <div className={classes.name}>{t(`admin.metrics.${metric.name}`)}</div>
        <div
          className={cn(classes.marker, {
            [classes.error]: isError,
            [classes.success]: !isError,
          })}
          style={customStyle}
        >
          {count}
        </div>
      </div>
      <div className={classes.chart}>
        <Line options={options} data={metricsChartData} />
      </div>
    </div>
  );
};

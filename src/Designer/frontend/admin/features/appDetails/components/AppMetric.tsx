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

const getChartOptions = (time: number) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      // grid: {
      //   display: false,
      // },
      ticks: {
        //display: false,
        font: {
          color: '#ddd',
          size: 10,
        },
        // maxTicksLimit: 5,
      },
      type: 'time',
      time: {
        unit: time >= 1140 ? 'hour' : 'minute',
      },
    },
    y: {
      beginAtZero: true,
      // border: {
      //   display: false,
      // },
      // grid: {
      //   display: false,
      // },
      ticks: {
        //display: false,
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
        /*
        fill: {
          target: { value: 70 },
          above: 'rgba(206, 77, 77, 0.7)', // Green color with transparency
          below: 'rgba(16, 140, 34, 0.7)', // No fill below
        },
        */
        fill: true,
        data: dataPoints?.map((dataPoint) => dataPoint.count),
        // tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        ...options,
      },
    ],
  };
};

const COLORS = [
  'rgb(54, 162, 235)', // blue
  //'rgb(255, 99, 132)', // red
  'rgb(255, 159, 64)', // orange
  'rgb(255, 205, 86)', // yellow
  'rgb(75, 192, 192)', // green
  'rgb(153, 102, 255)', // purple
  //'rgb(201, 203, 207)', // grey
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
  time: number;
  metric: Metric;
};

export const AppMetric = ({ time, metric }: AppMetricProps) => {
  const { t } = useTranslation();
  const options = getChartOptions(time);
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

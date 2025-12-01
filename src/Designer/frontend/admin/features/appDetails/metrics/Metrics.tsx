import React, { useState } from 'react';
import classes from './Metrics.module.css';
import { Link, useParams } from 'react-router-dom';
import {
  StudioBreadcrumbs,
  StudioCard,
  StudioHeading,
  StudioSelect,
  StudioSpinner,
} from '@studio/components';
import { useMetricsQuery } from 'admin/hooks/queries/useMetricsQuery';
import { useTranslation } from 'react-i18next';
import type { MetricDataPoint } from 'admin/types/metrics/MetricDataPoint';
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

import { Line } from 'react-chartjs-2';
import type { Metric } from 'admin/types/metrics/Metric';

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
  //maintainAspectRatio: false,
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
const getChartData = (dataPoints: MetricDataPoint[], options) => {
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

const formatCount = (name: string, count: number) => {
  switch (name) {
    case 'up':
      return count === 1 ? 'UP' : 'DOWN';
    default:
      return count;
  }
};

export const Metrics = () => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const [time, setTime] = useState(1440);
  const { t } = useTranslation();
  const options = getChartOptions(time);

  const {
    data: metrics,
    isPending: metricsIsPending,
    isError: metricsIsError,
  } = useMetricsQuery(org, env, app, time, {
    hideDefaultError: true,
  });

  const handleTime = (value: number) => {
    setTime(value);
  };

  return (
    <>
      <StudioBreadcrumbs>
        <StudioBreadcrumbs.Link>{app}</StudioBreadcrumbs.Link>
        <StudioBreadcrumbs.List>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`/${org}/apps`}>Publiserte apper</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to=''>{env}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to=''>{app}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
      {/* <StudioHeading className={classes.heading}> */}
      <StudioSelect
        label=''
        // description={'Time'}
        value={time}
        onChange={(e) => handleTime(Number(e.target.value))}
        className={classes.select}
      >
        <StudioSelect.Option value='5'>5m</StudioSelect.Option>
        <StudioSelect.Option value='15'>15m</StudioSelect.Option>
        <StudioSelect.Option value='30'>30m</StudioSelect.Option>
        <StudioSelect.Option value='60'>1t</StudioSelect.Option>
        <StudioSelect.Option value='360'>6t</StudioSelect.Option>
        <StudioSelect.Option value='720'>12t</StudioSelect.Option>
        <StudioSelect.Option value='1440'>1d</StudioSelect.Option>
        <StudioSelect.Option value='4320'>3d</StudioSelect.Option>
        <StudioSelect.Option value='10080'>7d</StudioSelect.Option>
        <StudioSelect.Option value='43200'>30d</StudioSelect.Option>
      </StudioSelect>
      {/* </StudioHeading> */}
      <div className={classes.appMetrics}>{getChart(options, t, metrics)}</div>
    </>
  );
};

const getChart = (options, t, metrics?: Metric[]) => {
  return (
    <div className={classes.metricsContainer}>
      {metrics?.map((metric) => {
        const isAppMetric = metric.name.startsWith('altinn_');
        const isError = !isAppMetric && metric.name === 'failed_process_next_requests';
        const color = getRandomColor();
        const metricsChartData = getChartData(
          metric.dataPoints,
          isAppMetric
            ? color
            : {
                borderColor: isError ? 'rgba(206, 77, 77)' : 'rgb(16, 140, 34)',
                backgroundColor: isError ? 'rgba(206, 77, 77, 0.7)' : 'rgba(16, 140, 34, 0.7)',
              },
        );

        var customOptions =
          metric.name === 'up'
            ? {
                ...options,
                scales: {
                  ...options.scales,
                  y: {
                    ...options.scales.y,
                    min: metric.name === 'up' && 0,
                    max: metric.name === 'up' && 1,
                  },
                },
              }
            : options;

        const count = metric.dataPoints.reduce((sum, item) => sum + item.count, 0);

        return (
          <StudioCard key={metric.name} data-color='neutral' className={classes.metric}>
            <div className={classes.title}>
              <StudioHeading level={3} className={classes.h3}>
                {t(`admin.metrics.${metric.name}`)}
              </StudioHeading>
              <div
                className={isError ? classes.errorDangerCount : classes.errorSuccessCount}
                style={{
                  backgroundColor: isAppMetric && color.backgroundColor,
                  color: isAppMetric && color.color,
                  opacity: isAppMetric && 1,
                }}
              >
                {formatCount(metric.name, count)}
              </div>
            </div>
            <div className={classes.chart}>
              <Line options={customOptions} data={metricsChartData} />
            </div>
          </StudioCard>
        );
      })}
    </div>
  );
};

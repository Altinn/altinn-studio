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
import type { MetricDataPoint } from 'admin/types/MetricDataPoint';
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
import type { Metric } from 'admin/types/Metric';

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

const formatCount = (metric: Metric) => {
  switch (metric.name) {
    case 'up':
      return metric.count === 1 ? 'UP' : 'DOWN';
    case 'slow_requests':
      return `${metric.count} ms`;
    case 'requests_rps':
      return `${metric.count} req/s`; // requests / second
    case 'error_ratio':
      return `${metric.count} %`; // of total requests
    case 'cpu_usage':
      return `${metric.count} %`; // of requested CPU
    case 'memory_usage':
      return `${metric.count} %`; // of requested memory
    default:
      return metric.count;
  }
};

export const Metrics = () => {
  const { org, env, app } = useParams();
  const [time, setTime] = useState(1440);
  const { t } = useTranslation();
  const options = getChartOptions(time);

  const { data: metrics } = useMetricsQuery(org, env, [], time, app);

  const handleTime = (value: number) => {
    setTime(value);
  };

  const appMetric = metrics
    ?.filter((e) => e.appName === app /*  app.app */)
    .map((e) => {
      return e.metrics;
    })
    .flat();

  const systemMetrics = appMetric?.filter((item) => !item.name.startsWith('altinn_'));
  const appMetrics = appMetric?.filter((item) => item.name.startsWith('altinn_'));

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
      <h1 className={classes.heading}>
        METRICS
        <StudioSelect
          label={null}
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
      </h1>
      <StudioHeading className={classes.h2}>{t('Application health')}</StudioHeading>
      {getChart(options, t, systemMetrics)}
      <StudioHeading className={classes.h2}>{t('Application metrics')}</StudioHeading>
      <div className={classes.appMetrics}>
        {getChart(
          options,
          t,
          appMetrics?.filter((appM) => appM.name.startsWith('altinn_app_lib_instances')),
        )}
        {getChart(
          options,
          t,
          appMetrics?.filter((appM) => appM.name.startsWith('altinn_app_lib_processes')),
        )}
        {getChart(
          options,
          t,
          appMetrics?.filter(
            (appM) =>
              !appM.name.startsWith('altinn_app_lib_instances') &&
              !appM.name.startsWith('altinn_app_lib_processes'),
          ),
        )}
      </div>
    </>
  );
};

const getChart = (options, t, metrics) => {
  return (
    <div className={classes.metricsContainer}>
      {metrics?.map((metric) => {
        const isAppMetric = metric.name.startsWith('altinn_');
        const isError = !isAppMetric && metric.isError;
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

        return (
          <StudioCard key={metric.name} data-color='neutral' className={classes.metric}>
            <div className={classes.title}>
              <StudioHeading level={3} className={classes.h3}>
                {t(`metrics_metric_${metric.name}`)}
              </StudioHeading>
              {metric.count !== undefined ? (
                <div
                  className={isError ? classes.errorDangerCount : classes.errorSuccessCount}
                  style={{
                    backgroundColor: isAppMetric && color.backgroundColor,
                    color: isAppMetric && color.color,
                    opacity: isAppMetric && 1,
                  }}
                >
                  {formatCount(metric)}
                </div>
              ) : (
                <StudioSpinner aria-label={t('general.loading')} />
              )}
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

import React from 'react';
import classes from './AppMetric.module.css';
import { useTranslation } from 'react-i18next';
import type { AppMetricDataPoint } from 'admin/types/metrics/AppMetricDataPoint';
import type { AppMetric as Metric } from 'admin/types/metrics/AppMetric';
import 'chartjs-adapter-date-fns';
import { StudioAlert, StudioLink } from '@studio/components';

import { Line } from 'react-chartjs-2';
import { appErrorMetricsLogsPath } from 'admin/utils/apiPaths';
import { useParams } from 'react-router-dom';

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
  const { org, env, app } = useParams() as { org: string; env: string; app: string };

  const metricsChartData = getChartData(metric.dataPoints, {
    borderColor: isError ? '#590d0d' : isErrorMetric ? '#023409' : '#042d4d',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  });

  return (
    <StudioAlert
      key={metric.name}
      data-color={isError ? 'danger' : isErrorMetric ? 'success' : 'info'}
      className={classes.metric}
    >
      <div className={classes.metricTitle}>
        <span className={classes.metricText}>
          <span className={classes.metricCount}>{count}</span>
          {t(`admin.metrics.${metric.name}`)}
        </span>
        {isErrorMetric && (
          <StudioLink
            href={appErrorMetricsLogsPath(org, env, app, metric.name, range!)}
            rel='noopener noreferrer'
            target='_blank'
            className={classes.metricLink}
          >
            {t('admin.alerts.link')}
          </StudioLink>
        )}
      </div>
      <div className={classes.chart}>
        <Line options={options} data={metricsChartData} />
      </div>
    </StudioAlert>
  );
};

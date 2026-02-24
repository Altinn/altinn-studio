import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AppMetric as Metric } from 'admin/types/metrics/AppMetric';

import { Bar } from 'react-chartjs-2';
import { getChartOptions } from 'admin/utils/charts';
import { Alert } from 'admin/components/Alert/Alert';

type AppErrorMetricProps = {
  metric: Metric;
  range: number;
};

export const AppErrorMetric = ({ metric, range }: AppErrorMetricProps) => {
  const { t } = useTranslation();
  const options = getChartOptions(metric.intervalInMinutes, range);
  const count = metric.counts.reduce((sum, item) => sum + item, 0);
  const isError = count > 0;

  const metricsChartData = {
    labels: metric.timestamps,
    datasets: [
      {
        data: metric.counts,
        borderColor: isError ? '#b81a1a' : '#108c22',
        backgroundColor: isError ? '#b81a1a' : '#108c22',
      },
    ],
  };

  return (
    <Alert
      color={isError ? 'danger' : 'success'}
      title={t(`admin.metrics.${metric.name}`)}
      count={count.toString()}
      url={metric.logsUrl}
    >
      <Bar options={options} data={metricsChartData} />
    </Alert>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AppMetric as Metric } from 'admin/types/metrics/AppMetric';

import { Bar } from 'react-chartjs-2';
import { Alert } from 'admin/components/Alert/Alert';
import { getChartOptions } from 'admin/utils/charts';

type AppMetricProps = {
  range: number;
  metric: Metric;
};

export const AppMetric = ({ range, metric }: AppMetricProps) => {
  const { t } = useTranslation();
  const options = getChartOptions(metric.bucketSize, range);
  const count = metric.counts.reduce((sum, item) => sum + item, 0);

  const metricsChartData = {
    labels: metric.timestamps,
    datasets: [
      {
        data: metric.counts,
        borderColor: '#0860a3',
        backgroundColor: '#0860a3',
      },
    ],
  };

  return (
    <Alert color={'info'} title={t(`admin.metrics.${metric.name}`)} count={count.toString()}>
      <Bar options={options} data={metricsChartData} />
    </Alert>
  );
};

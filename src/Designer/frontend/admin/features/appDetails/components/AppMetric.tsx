import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AppMetric as Metric } from 'admin/types/metrics/AppMetric';

import { Line } from 'react-chartjs-2';
import { Alert } from 'admin/components/Alert/Alert';
import { getChartData, getChartOptions } from 'admin/utils/charts';

type AppMetricProps = {
  range: number;
  metric: Metric;
};

export const AppMetric = ({ range, metric }: AppMetricProps) => {
  const { t } = useTranslation();
  const options = getChartOptions(range);
  const count = metric.dataPoints.reduce((sum, item) => sum + item.count, 0);

  const metricsChartData = getChartData(metric.dataPoints, {
    borderColor: '#042d4d',
  });

  return (
    <Alert color={'info'} title={t(`admin.metrics.${metric.name}`)} count={count.toString()}>
      <Line options={options} data={metricsChartData} />
    </Alert>
  );
};

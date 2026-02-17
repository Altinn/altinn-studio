import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AppMetric as Metric } from 'admin/types/metrics/AppMetric';

import { Line } from 'react-chartjs-2';
import { getChartData, getChartOptions } from 'admin/utils/charts';
import { Alert } from 'admin/components/Alert/Alert';

type AppErrorMetricProps = {
  metric: Metric;
  range: number;
};

export const AppErrorMetric = ({ metric, range }: AppErrorMetricProps) => {
  const { t } = useTranslation();
  const options = getChartOptions(range);
  const count = metric.dataPoints.reduce((sum, item) => sum + item.count, 0);
  const isError = count > 0;

  const metricsChartData = getChartData(metric.dataPoints, {
    borderColor: isError ? '#590d0d' : '#023409',
  });

  return (
    <Alert
      color={isError ? 'danger' : 'success'}
      title={t(`admin.metrics.${metric.name}`)}
      count={count.toString()}
      url={metric.logsUrl}
    >
      <Line options={options} data={metricsChartData} />
    </Alert>
  );
};

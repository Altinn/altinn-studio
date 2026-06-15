import { useTranslation } from 'react-i18next';
import type { AppMetric as Metric } from 'admin/features/apps/types/metrics/AppMetric';

import { Bar } from 'react-chartjs-2';
import { Alert } from 'admin/features/apps/components/Alert/Alert';
import { getChartOptions } from 'admin/features/apps/utils/charts';

type AppMetricProps = {
  range: number;
  metric: Metric;
  className?: string;
};

export const AppMetric = ({ range, metric, className }: AppMetricProps) => {
  const { t } = useTranslation();

  console.log('metric.bucketSize', metric.bucketSize);
  console.log('range', range);
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
    <Alert
      color={'info'}
      title={t(`admin.metrics.${metric.name}`)}
      count={count.toString()}
      className={className}
    >
      <Bar options={options} data={metricsChartData} />
    </Alert>
  );
};

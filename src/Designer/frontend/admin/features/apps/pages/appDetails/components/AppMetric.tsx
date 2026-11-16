import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppMetric as Metric } from 'admin/features/apps/types/metrics/AppMetric';
import type { AppDeploymentEvent } from 'admin/features/apps/types/AppDeploymentEvent';

import { Bar } from 'react-chartjs-2';
import { Alert } from 'admin/features/apps/components/Alert/Alert';
import { getChartOptions, getChartTimeAxis } from 'admin/features/apps/utils/charts';
import {
  deploymentMarkersPlugin,
  groupDeploymentsByBucket,
} from 'admin/features/apps/utils/deploymentMarkers';
import { DeploymentList } from './DeploymentMarkers/DeploymentList';

type AppMetricProps = {
  range: number;
  metric: Metric;
  /** The deploys and undeploys in the card's range, drawn as dashed lines in the chart. */
  deployments?: AppDeploymentEvent[];
};

export const AppMetric = ({ range, metric, deployments = [] }: AppMetricProps) => {
  const { t } = useTranslation();
  const options = getChartOptions(metric.bucketSize, range);
  const count = metric.counts.reduce((sum, item) => sum + item, 0);

  const { min, max, bucketSizeInMs } = getChartTimeAxis(metric.bucketSize, range);
  const markers = useMemo(
    () => groupDeploymentsByBucket(deployments, bucketSizeInMs, min, max),
    [deployments, bucketSizeInMs, min, max],
  );
  const plugins = useMemo(
    () => [
      deploymentMarkersPlugin({
        markers,
        manyText: (n) => t('admin.metrics.deployments.many', { count: n }),
        lineColor: '#5b6778',
        undeployColor: '#a8b3c2',
        textColor: '#5b6778',
      }),
    ],
    [markers, t],
  );
  const shownDeployments = markers.flatMap((marker) => marker.deployments);

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
      footer={<DeploymentList deployments={shownDeployments} />}
    >
      <Bar options={options} data={metricsChartData} plugins={plugins} />
    </Alert>
  );
};

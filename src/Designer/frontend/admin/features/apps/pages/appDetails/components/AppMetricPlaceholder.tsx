import { useTranslation } from 'react-i18next';
import type { AppMetric as Metric } from 'admin/features/apps/types/metrics/AppMetric';

import { Bar } from 'react-chartjs-2';
import { Alert } from 'admin/features/apps/components/Alert/Alert';
import { getChartOptions } from 'admin/features/apps/utils/charts';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { StudioAlert, StudioLink } from '@studio/components';
import classes from './AppMetricPlaceholder.module.css';

type AppMetricPlaceholderProps = {
  range: number;
  metric: Metric;
};

export const AppMetricPlaceholder = ({ range, metric }: AppMetricPlaceholderProps) => {
  const { t } = useTranslation();
  const options = getChartOptions(metric.bucketSize, range);

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

  const OTelDocs = altinnDocsUrl({
    relativeUrl: 'altinn-studio/v8/guides/administration/monitor-and-instrument/',
  });

  return (
    <div className={classes.chartOverlay}>
      <Alert color={''} title={t(`admin.metrics.${metric.name}`)} count={'0'}>
        <Bar options={options} data={metricsChartData} />
      </Alert>
      <StudioAlert data-color='info' className={classes.disclaimer}>
        {t('admin.metrics.app.no_data')}{' '}
        <StudioLink href={OTelDocs} target='_blank'>
          {t('admin.metrics.app.no_data_link')}
        </StudioLink>
      </StudioAlert>
    </div>
  );
};

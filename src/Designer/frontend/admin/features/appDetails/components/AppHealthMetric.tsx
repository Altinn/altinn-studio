import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AppHealthMetric as HealthMetric } from 'admin/types/metrics/AppHealthMetric';
import { Doughnut } from 'react-chartjs-2';
import { Alert } from 'admin/shared/Alert/Alert';

type AppHealthMetricProps = {
  metric: HealthMetric;
};

export const AppHealthMetric = ({ metric }: AppHealthMetricProps) => {
  const { t } = useTranslation();
  const isDown = metric.count == 0;
  const isPartiallyDown = metric.count > 0 && metric.count < 100;

  return (
    <Alert
      color={isDown ? 'danger' : isPartiallyDown ? 'warning' : 'success'}
      title={t(`admin.metrics.${metric.name}`)}
      count={metric.count + '%'}
    >
      <Doughnut
        data={{
          datasets: [
            {
              data: [100],
              backgroundColor: [isDown ? '#e8adad' : isPartiallyDown ? '#eeb04c' : '#8fc997'],
              borderWidth: 0,
            },
          ],
        }}
      />
    </Alert>
  );
};

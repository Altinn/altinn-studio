import React from 'react';
import classes from './AppHealthMetric.module.css';
import { useTranslation } from 'react-i18next';
import type { AppHealthMetric as HealthMetric } from 'admin/types/metrics/AppHealthMetric';
import { StudioAlert } from '@studio/components';
import 'chartjs-adapter-date-fns';
import { Doughnut } from 'react-chartjs-2';

type AppHealthMetricProps = {
  metric: HealthMetric;
};

export const AppHealthMetric = ({ metric }: AppHealthMetricProps) => {
  const { t } = useTranslation();
  const isDown = metric.count == 0;
  const isPartiallyDown = metric.count > 0 && metric.count < 100;

  return (
    <StudioAlert
      key={metric.name}
      data-color={isDown ? 'danger' : isPartiallyDown ? 'warning' : 'success'}
      className={classes.metric}
    >
      <div className={classes.title}>
        <span className={classes.metricText}>
          <span className={classes.metricCount}>{metric.count}%</span>
          {t(`admin.metrics.${metric.name}`)}
        </span>
      </div>
      <div className={classes.chart}>
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
      </div>
    </StudioAlert>
  );
};

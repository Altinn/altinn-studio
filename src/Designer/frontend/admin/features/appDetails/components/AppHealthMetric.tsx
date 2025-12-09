import React from 'react';
import classes from './AppHealthMetric.module.css';
import { useTranslation } from 'react-i18next';
import type { AppHealthMetric as HealthMetric } from 'admin/types/metrics/AppHealthMetric';
import 'chartjs-adapter-date-fns';
import cn from 'classnames';

type AppHealthMetricProps = {
  metric: HealthMetric;
};

export const AppHealthMetric = ({ metric }: AppHealthMetricProps) => {
  const { t } = useTranslation();
  const isError = metric.count == 0;

  return (
    <div key={metric.name}>
      <div className={classes.title}>
        <div className={classes.name}>{t(`admin.metrics.${metric.name}`)}</div>
      </div>
      <div className={classes.chart}>
        <div
          className={cn(classes.marker, {
            [classes.error]: isError,
            [classes.success]: !isError,
          })}
        >
          {metric.name === 'health' ? (isError ? 'Down' : 'Up') : `${metric.count}%`}
        </div>
      </div>
    </div>
  );
};

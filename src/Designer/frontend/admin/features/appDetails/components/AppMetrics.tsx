import React from 'react';
import classes from './AppMetrics.module.css';
import { useParams } from 'react-router-dom';
import { StudioCard, StudioError, StudioHeading, StudioSpinner } from '@studio/components';
import { useAppMetricsQuery } from 'admin/hooks/queries/useAppMetricsQuery';
import { useTranslation } from 'react-i18next';

import { AppMetric } from './AppMetric';
import { useAppHealthMetricsQuery } from 'admin/hooks/queries/useAppHealthMetricsQuery';
import { AppHealthMetric } from './AppHealthMetric';
import { TimeRangeSelect } from 'admin/shared/TimeRangeSelect';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
} from 'chart.js';
import { useAppErrorMetricsQuery } from 'admin/hooks/queries/useAppErrorMetricsQuery';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
);

type AppMetricsProps = {
  range: number;
  setRange: (value: number) => void;
};

export const AppMetrics = ({ range, setRange }: AppMetricsProps) => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const { t } = useTranslation();

  const {
    data: appHealthMetrics,
    isPending: appHealthMetricsIsPending,
    isError: appHealthMetricsIsError,
  } = useAppHealthMetricsQuery(org, env, app, {
    hideDefaultError: true,
  });

  const {
    data: appErrorMetrics,
    isPending: appErrorMetricsIsPending,
    isError: appErrorMetricsIsError,
  } = useAppErrorMetricsQuery(org, env, app, range!, {
    hideDefaultError: true,
  });

  const {
    data: appMetrics,
    isPending: appMetricsIsPending,
    isError: appMetricsIsError,
  } = useAppMetricsQuery(org, env, app, range!, {
    hideDefaultError: true,
  });

  const renderAppHealthMetrics = () => {
    if (appHealthMetricsIsPending) {
      return <StudioSpinner aria-label={t('admin.metrics.health.loading')} />;
    }

    if (appHealthMetricsIsError) {
      return (
        <StudioError className={classes.metric}>{t('admin.metrics.health.error')}</StudioError>
      );
    }

    return appHealthMetrics?.map((metric) => <AppHealthMetric key={metric.name} metric={metric} />);
  };

  const renderAppErrorMetrics = () => {
    if (appErrorMetricsIsPending) {
      return <StudioSpinner aria-label={t('admin.metrics.errors.loading')} />;
    }

    if (appErrorMetricsIsError) {
      return (
        <StudioError className={classes.metric}>{t('admin.metrics.errors.error')}</StudioError>
      );
    }

    return appErrorMetrics?.map((metric) => (
      <AppMetric key={metric.name} range={range} metric={metric} />
    ));
  };

  const renderAppMetrics = () => {
    if (appMetricsIsPending) {
      return <StudioSpinner aria-label={t('admin.metrics.app.loading')} />;
    }

    if (appMetricsIsError) {
      return <StudioError className={classes.metric}>{t('admin.metrics.app.error')}</StudioError>;
    }

    return appMetrics?.map((metric) => (
      <AppMetric key={metric.name} range={range} metric={metric} />
    ));
  };

  return (
    <StudioCard data-color='neutral'>
      <StudioHeading className={classes.heading}>
        <TimeRangeSelect
          label={t('admin.metrics.heading')}
          value={range!}
          onChange={(e) => setRange(e)}
        />
      </StudioHeading>
      <div className={classes.content}>
        {renderAppHealthMetrics()}
        {renderAppErrorMetrics()}
        {renderAppMetrics()}
      </div>
    </StudioCard>
  );
};

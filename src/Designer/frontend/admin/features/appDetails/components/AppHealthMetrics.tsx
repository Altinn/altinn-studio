import React from 'react';
import classes from './AppHealthMetrics.module.css';
import { useParams } from 'react-router-dom';
import { StudioCard, StudioError, StudioHeading, StudioSpinner } from '@studio/components';
import { useHealthMetricsQuery } from 'admin/hooks/queries/useHealthMetricsQuery';
import { useTranslation } from 'react-i18next';

import { AppHealthMetric } from './AppHealthMetric';

export const AppHealthMetrics = () => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const { t } = useTranslation();

  const {
    data: healthMetrics,
    isPending: healthMetricsIsPending,
    isError: healthMetricsIsError,
  } = useHealthMetricsQuery(org, env, app, {
    hideDefaultError: true,
  });

  const showContent = () => {
    if (healthMetricsIsPending) {
      return <StudioSpinner aria-label={t('general.loading')} />;
    }

    if (healthMetricsIsError) {
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    }

    return healthMetrics?.map((metric) => <AppHealthMetric key={metric.name} metric={metric} />);
  };

  return (
    <StudioCard data-color='neutral'>
      <StudioHeading className={classes.heading}>{t('admin.metrics.health.heading')}</StudioHeading>
      <div className={classes.metrics}>{showContent()}</div>
    </StudioCard>
  );
};

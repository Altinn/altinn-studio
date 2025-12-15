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
    data: appMetrics,
    isPending: appMetricsIsPending,
    isError: appMetricsIsError,
  } = useAppMetricsQuery(org, env, app, range!, {
    hideDefaultError: true,
  });

  const renderAppHealthMetrics = () => {
    if (appHealthMetricsIsPending) {
      return <StudioSpinner aria-label={t('general.loading')} />;
    }

    if (appHealthMetricsIsError) {
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    }

    return appHealthMetrics?.map((metric) => <AppHealthMetric key={metric.name} metric={metric} />);
  };

  const renderAppErrorMetrics = () => {
    if (appMetricsIsPending) {
      return <StudioSpinner aria-label={t('general.loading')} />;
    }

    if (appMetricsIsError) {
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    }

    return (
      <div className={classes.metrics}>
        {appMetrics
          ?.filter((metric) => metric.name.startsWith('failed_'))
          ?.map((metric) => (
            <AppMetric key={metric.name} range={range} metric={metric} />
          ))}
      </div>
    );
  };

  const renderAppMetrics = () => {
    if (appMetricsIsPending) {
      return <StudioSpinner aria-label={t('general.loading')} />;
    }

    if (appMetricsIsError) {
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    }

    return (
      <div className={classes.metrics}>
        {appMetrics
          ?.filter((metric) => !metric.name.startsWith('failed_'))
          ?.map((metric) => (
            <AppMetric key={metric.name} range={range} metric={metric} />
          ))}
      </div>
    );
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
        <div>
          <StudioHeading className={classes.subheading}>
            {t('admin.metrics.health.heading')}
          </StudioHeading>
          {renderAppHealthMetrics()}
        </div>
        <div>
          <StudioHeading className={classes.subheading}>
            {t('admin.metrics.feil.heading')}
          </StudioHeading>
          {renderAppErrorMetrics()}
        </div>
        <div>
          <StudioHeading className={classes.subheading}>
            {t('admin.metrics.app.heading')}
          </StudioHeading>
          {renderAppMetrics()}
        </div>
      </div>
    </StudioCard>
  );
};

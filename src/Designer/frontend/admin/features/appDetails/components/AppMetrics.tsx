import React, { useState } from 'react';
import classes from './AppMetrics.module.css';
import { useParams } from 'react-router-dom';
import {
  StudioCard,
  StudioError,
  StudioHeading,
  StudioSelect,
  StudioSpinner,
} from '@studio/components';
import { useMetricsQuery } from 'admin/hooks/queries/useMetricsQuery';
import { useTranslation } from 'react-i18next';

import { AppMetric } from './AppMetric';
import { useHealthMetricsQuery } from 'admin/hooks/queries/useHealthMetricsQuery';
import { AppHealthMetric } from './AppHealthMetric';

export const AppMetrics = () => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const [time, setTime] = useState(1440);
  const { t } = useTranslation();

  const {
    data: healthMetrics,
    isPending: healthMetricsIsPending,
    isError: healthMetricsIsError,
  } = useHealthMetricsQuery(org, env, app, {
    hideDefaultError: true,
  });

  const {
    data: metrics,
    isPending: metricsIsPending,
    isError: metricsIsError,
  } = useMetricsQuery(org, env, app, time, {
    hideDefaultError: true,
  });

  const handleTime = (value: number) => {
    setTime(value);
  };

  const showHealthMetrics = () => {
    if (healthMetricsIsPending) {
      return <StudioSpinner aria-label={t('general.loading')} />;
    }

    if (healthMetricsIsError) {
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    }

    return healthMetrics?.map((metric) => <AppHealthMetric key={metric.name} metric={metric} />);
  };

  const showErrorMetrics = () => {
    if (metricsIsPending) {
      return <StudioSpinner aria-label={t('general.loading')} />;
    }

    if (metricsIsError) {
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    }

    var errorMetrics = metrics?.filter((metric) => metric.name.startsWith('failed_'));

    return (
      <div className={classes.metrics}>
        {errorMetrics?.map((metric) => (
          <AppMetric key={metric.name} time={time} metric={metric} />
        ))}
      </div>
    );
  };

  const showAppMetrics = () => {
    if (metricsIsPending) {
      return <StudioSpinner aria-label={t('general.loading')} />;
    }

    if (metricsIsError) {
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    }

    var appMetrics = metrics?.filter((metric) => !metric.name.startsWith('failed_'));

    return (
      <div className={classes.metrics}>
        {appMetrics?.map((metric) => (
          <AppMetric key={metric.name} time={time} metric={metric} />
        ))}
      </div>
    );
  };

  return (
    <StudioCard data-color='neutral' className={classes.card}>
      <div className={classes.header}>
        <StudioSelect
          label={t('admin.metrics.time_window')}
          value={time}
          onChange={(e) => handleTime(Number(e.target.value))}
          className={classes.select}
        >
          <StudioSelect.Option value='5'>5m</StudioSelect.Option>
          <StudioSelect.Option value='15'>15m</StudioSelect.Option>
          <StudioSelect.Option value='30'>30m</StudioSelect.Option>
          <StudioSelect.Option value='60'>1t</StudioSelect.Option>
          <StudioSelect.Option value='360'>6t</StudioSelect.Option>
          <StudioSelect.Option value='720'>12t</StudioSelect.Option>
          <StudioSelect.Option value='1440'>1d</StudioSelect.Option>
          <StudioSelect.Option value='4320'>3d</StudioSelect.Option>
          <StudioSelect.Option value='10080'>7d</StudioSelect.Option>
          <StudioSelect.Option value='43200'>30d</StudioSelect.Option>
        </StudioSelect>
        <StudioHeading className={classes.heading}>{t('admin.metrics.heading')}</StudioHeading>
      </div>
      <div className={classes.content}>
        <div>
          <StudioHeading className={classes.subheading}>
            {t('admin.metrics.health.heading')}
          </StudioHeading>
          {showHealthMetrics()}
        </div>
        <div className={classes.subcontent}>
          <div>
            <StudioHeading className={classes.subheading}>
              {t('admin.metrics.feil.heading')}
            </StudioHeading>
            {showErrorMetrics()}
          </div>
          <div>
            <StudioHeading className={classes.subheading}>
              {t('admin.metrics.app.heading')}
            </StudioHeading>
            {showAppMetrics()}
          </div>
        </div>
      </div>
    </StudioCard>
  );
};

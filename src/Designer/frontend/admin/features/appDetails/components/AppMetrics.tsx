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
import { useAppMetricsQuery } from 'admin/hooks/queries/useAppMetricsQuery';
import { useTranslation } from 'react-i18next';

import { AppMetric } from './AppMetric';
import { useAppHealthMetricsQuery } from 'admin/hooks/queries/useAppHealthMetricsQuery';
import { AppHealthMetric } from './AppHealthMetric';

export const AppMetrics = () => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const [time, setTime] = useState(1440);
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
  } = useAppMetricsQuery(org, env, app, time, {
    hideDefaultError: true,
  });

  const handleTime = (value: number) => {
    setTime(value);
  };

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
            <AppMetric key={metric.name} time={time} metric={metric} />
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

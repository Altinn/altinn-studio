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
import { Trans, useTranslation } from 'react-i18next';

import { AppMetric } from './AppMetric';

export const AppMetrics = () => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const [time, setTime] = useState(1440);
  const { t } = useTranslation();

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

  const showContent = () => {
    if (metricsIsPending) {
      return <StudioSpinner aria-label={t('general.loading')} />;
    }

    if (metricsIsError) {
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    }

    return metrics?.map((metric) => <AppMetric key={metric.name} time={time} metric={metric} />);
  };

  return (
    <StudioCard data-color='neutral'>
      <StudioHeading className={classes.heading}>
        <Trans
          i18nKey={'admin.metrics.heading'}
          components={{
            time: (
              <StudioSelect
                label=''
                // description={'Time'}
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
            ),
          }}
        />
      </StudioHeading>
      <div className={classes.metrics}>{showContent()}</div>
    </StudioCard>
  );
};

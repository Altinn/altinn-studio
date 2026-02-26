import React from 'react';
import { useEnvironmentTitle } from 'admin/hooks/useEnvironmentTitle';
import classes from './AppMetrics.module.css';
import { useParams } from 'react-router-dom';
import {
  StudioAlert,
  StudioCard,
  StudioError,
  StudioHeading,
  StudioSpinner,
} from '@studio/components';
import { useAppMetricsQuery } from 'admin/hooks/queries/useAppMetricsQuery';
import { useTranslation } from 'react-i18next';
import 'chartjs-adapter-date-fns';

import { AppMetric } from './AppMetric';
import { useAppHealthMetricsQuery } from 'admin/hooks/queries/useAppHealthMetricsQuery';
import { AppHealthMetric } from './AppHealthMetric';
import { TimeRangeSelect } from 'admin/components/TimeRangeSelect/TimeRangeSelect';
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
import { AppErrorMetric } from './AppErrorMetric';
import { isAxiosError } from 'axios';
import { useCurrentOrg } from 'admin/layout/PageLayout';

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

export type AppMetricsProps = {
  range: number;
  setRange: (value: number) => void;
};

export const AppMetrics = ({ range, setRange }: AppMetricsProps) => {
  const { org, environment, app } = useParams() as {
    org: string;
    environment: string;
    app: string;
  };
  const { t, i18n } = useTranslation();

  const envTitle = useEnvironmentTitle(environment);
  const orgName = useCurrentOrg().name[i18n.language];

  const {
    data: appHealthMetrics,
    isPending: appHealthMetricsIsPending,
    error: appHealthMetricsError,
    isError: appHealthMetricsIsError,
  } = useAppHealthMetricsQuery(org, environment, app, {
    hideDefaultError: true,
  });

  const {
    data: appErrorMetrics,
    isPending: appErrorMetricsIsPending,
    error: appErrorMetricsError,
    isError: appErrorMetricsIsError,
  } = useAppErrorMetricsQuery(org, environment, app, range!, {
    hideDefaultError: true,
  });

  const {
    data: appMetrics,
    isPending: appMetricsIsPending,
    error: appMetricsError,
    isError: appMetricsIsError,
  } = useAppMetricsQuery(org, environment, app, range!, {
    hideDefaultError: true,
  });

  const renderAppHealthMetrics = () => {
    if (appHealthMetricsIsPending) {
      return <StudioSpinner aria-label={t('admin.metrics.app.health.loading')} />;
    }

    if (appHealthMetricsIsError) {
      if (isAxiosError(appHealthMetricsError) && appHealthMetricsError.response?.status === 403) {
        return (
          <StudioAlert data-color='info' className={classes.metric}>
            {t('admin.metrics.app.health.missing_rights', {
              envTitle,
              orgName,
            })}
          </StudioAlert>
        );
      } else {
        return (
          <StudioError className={classes.metric}>
            {t('admin.metrics.app.health.error')}
          </StudioError>
        );
      }
    }

    return appHealthMetrics?.map((metric) => <AppHealthMetric key={metric.name} metric={metric} />);
  };

  const renderAppErrorMetrics = () => {
    if (appErrorMetricsIsPending) {
      return <StudioSpinner aria-label={t('admin.metrics.app.errors.loading')} />;
    }

    if (appErrorMetricsIsError) {
      if (isAxiosError(appErrorMetricsError) && appErrorMetricsError.response?.status === 403) {
        return (
          <StudioAlert data-color='info' className={classes.metric}>
            {t('admin.metrics.app.errors.missing_rights', {
              envTitle,
              orgName,
            })}
          </StudioAlert>
        );
      } else {
        return (
          <StudioError className={classes.metric}>
            {t('admin.metrics.app.errors.error')}
          </StudioError>
        );
      }
    }

    return appErrorMetrics?.map((metric) => (
      <AppErrorMetric key={metric.name} metric={metric} range={range} />
    ));
  };

  const renderAppMetrics = () => {
    if (appMetricsIsPending) {
      return <StudioSpinner aria-label={t('admin.metrics.app.loading')} />;
    }

    if (appMetricsIsError) {
      if (isAxiosError(appMetricsError) && appMetricsError.response?.status === 403) {
        return (
          <StudioAlert data-color='info' className={classes.metric}>
            {t('admin.metrics.app.missing_rights', { envTitle, orgName })}
          </StudioAlert>
        );
      } else {
        return <StudioError className={classes.metric}>{t('admin.metrics.app.error')}</StudioError>;
      }
    }

    return appMetrics?.map((metric) => (
      <AppMetric key={metric.name} metric={metric} range={range} />
    ));
  };

  return (
    <StudioCard data-color='neutral' className={classes.container}>
      <StudioHeading className={classes.heading} data-size='sm'>
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

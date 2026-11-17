import { useEnvironmentTitle } from 'admin/features/apps/hooks/useEnvironmentTitle';
import classes from './AppMetrics.module.css';
import {
  StudioAlert,
  StudioCard,
  StudioError,
  StudioHeading,
  StudioSpinner,
} from '@studio/components';
import { useAppMetricsQuery } from 'admin/features/apps/hooks/queries/useAppMetricsQuery';
import { useTranslation } from 'react-i18next';
import 'chartjs-adapter-date-fns';

import { AppMetric } from './AppMetric';
import { AppMetricPlaceholder } from './AppMetricPlaceholder';
import { useAppHealthMetricsQuery } from 'admin/features/apps/hooks/queries/useAppHealthMetricsQuery';
import { AppHealthMetric } from './AppHealthMetric';
import { TimeRangeSelect } from 'admin/features/apps/components/TimeRangeSelect/TimeRangeSelect';
import {
  Chart as ChartJS,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  TimeScale,
} from 'chart.js';
import { useAppErrorMetricsQuery } from 'admin/features/apps/hooks/queries/useAppErrorMetricsQuery';
import { AppErrorMetric } from './AppErrorMetric';
import { isAxiosError } from 'axios';
import { useCurrentOrg } from 'admin/contexts/OrgContext';
import { useRequiredRoutePathsParams } from 'admin/hooks/useRequiredRoutePathsParams';
import { useAppDeploymentsQuery } from 'admin/features/apps/hooks/queries/useAppDeploymentsQuery';
import { TypicalTimeMetric } from './TypicalTimeMetric/TypicalTimeMetric';
import { useMemo } from 'react';
import { useNow } from 'admin/features/apps/hooks/useNow';

ChartJS.register(LinearScale, BarElement, ArcElement, Title, Tooltip, Filler, TimeScale);

export type AppMetricsProps = {
  range: number;
  setRange: (value: number) => void;
};

export const AppMetrics = ({ range, setRange }: AppMetricsProps) => {
  const {
    owner: org,
    environment,
    app,
  } = useRequiredRoutePathsParams(['owner', 'environment', 'app']);
  const { t } = useTranslation();

  const envTitle = useEnvironmentTitle(environment);
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;

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

  // The deployments in the range, for the dashed lines in the charts. A failure here only
  // leaves the lines out; the charts still show. The window starts at the first render, so a
  // page open for hours keeps the same request and the same lines.
  const now = useNow(false);
  const since = useMemo(() => new Date(now - range * 60 * 1000).toISOString(), [now, range]);
  const { data: deployments } = useAppDeploymentsQuery(org, environment, app, since, {
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

    const hasData = appMetrics?.some((metric) => metric.counts.length > 0);
    if (!hasData) {
      return appMetrics?.map((metric) => (
        <AppMetricPlaceholder key={metric.name} metric={metric} range={range} />
      ));
    }

    return appMetrics?.map((metric) => (
      <AppMetric key={metric.name} metric={metric} range={range} deployments={deployments} />
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
        <TypicalTimeMetric org={org} environment={environment} app={app} />
      </div>
    </StudioCard>
  );
};

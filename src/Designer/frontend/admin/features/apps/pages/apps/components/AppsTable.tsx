import { useRunningAppsQuery } from 'admin/features/apps/hooks/queries/useRunningAppsQuery';
import { useEnvironmentTitle } from 'admin/features/apps/hooks/useEnvironmentTitle';
import classes from './AppsTable.module.css';
import type { PublishedApplication } from 'admin/features/apps/types/PublishedApplication';
import {
  StudioSpinner,
  StudioTable,
  StudioSearch,
  StudioError,
  StudioTabs,
  StudioAlert,
  StudioTag,
} from '@studio/components';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import { useErrorMetricsQuery } from 'admin/features/apps/hooks/queries/useErrorMetricsQuery';
import { PeriodSelect } from 'admin/features/apps/components/PeriodSelect/PeriodSelect';
import { AppsSummary } from './AppsSummary/AppsSummary';
import { MetricsStamp } from 'admin/features/apps/components/MetricsStamp/MetricsStamp';
import { useAppDailyMetricsQuery } from 'admin/features/apps/hooks/queries/useAppDailyMetricsQuery';
import type { ErrorMetric } from 'admin/features/apps/types/metrics/ErrorMetric';
import { formatTypicalTime, noUseMonths } from 'admin/features/apps/utils/appDeviations';
import { Alert } from 'admin/features/apps/components/Alert/Alert';
import { isAxiosError } from 'axios';
import { useCurrentOrg } from 'admin/contexts/OrgContext';
import { DEFAULT_SEARCH_PARAMS, ERROR_METRICS_RANGE_MINUTES } from 'admin/constants/constants';

export type AppsTableProps = {
  org: string;
};

export const AppsTable = ({ org }: AppsTableProps) => {
  const { data, status } = useRunningAppsQuery(org);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <AppsTableWithData org={org} runningApps={data} />;
  }
};

type AppsTableWithDataProps = {
  runningApps: Record<string, PublishedApplication[]>;
  org: string;
};

const environmentOrder = ['production', 'tt02', 'at22', 'at23', 'at24', 'yt01'];

const sortEnvironments = (a: string, b: string) => {
  const indexA = environmentOrder.indexOf(a);
  const indexB = environmentOrder.indexOf(b);
  return indexA - indexB;
};

const AppsTableWithData = ({ org, runningApps }: AppsTableWithDataProps) => {
  const { t } = useTranslation();
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const [search, setSearch] = useQueryParamState<string>('appSearch', '');
  const [selectedEnvironment, setSelectedEnvironment] = useQueryParamState<string>(
    'environment',
    DEFAULT_SEARCH_PARAMS.environment,
  );

  const availableEnvironments = Object.keys(runningApps).toSorted(sortEnvironments);

  const activeEnvironment =
    selectedEnvironment && availableEnvironments.includes(selectedEnvironment)
      ? selectedEnvironment
      : availableEnvironments[0];

  useEffect(() => {
    if (activeEnvironment && activeEnvironment !== selectedEnvironment) {
      setSelectedEnvironment(activeEnvironment);
    }
  }, [activeEnvironment, selectedEnvironment, setSelectedEnvironment]);

  if (!availableEnvironments.length) {
    return (
      <StudioAlert data-color='info'>{t('admin.environment.no_results', { orgName })}</StudioAlert>
    );
  }

  return (
    <StudioTabs value={activeEnvironment} onChange={setSelectedEnvironment}>
      <StudioTabs.List>
        {availableEnvironments.map((environment) => (
          <StudioTabs.Tab key={environment} value={environment}>
            {t('admin.environment.name', { environment })} ({runningApps[environment].length})
          </StudioTabs.Tab>
        ))}
      </StudioTabs.List>
      {availableEnvironments.map((environment) => (
        <StudioTabs.Panel key={environment} value={environment}>
          <AppsTableContent
            key={environment}
            org={org}
            environment={environment}
            search={search}
            setSearch={setSearch}
            runningApps={runningApps}
          />
        </StudioTabs.Panel>
      ))}
    </StudioTabs>
  );
};

type AppsTableContentProps = AppsTableWithDataProps & {
  environment: string;
  search?: string;
  setSearch: (newState: string) => void;
};

/** One app as the list shows it: the deployed app joined with its daily metrics and its errors. */
export type AppRow = {
  app: string;
  version: string;
  instancesCreated: number;
  instancesCreatedPreviousPeriod: number;
  instancesCompleted: number;
  secondsToCompleteP50: number | null;
  lastInstanceCreatedOn: string | null;
  noUseMonths: number;
  errorMetrics: ErrorMetric[];
  errorCount: number;
};

type SortColumn = 'app' | 'version' | 'instancesCreated' | 'deviations';
type SortDirection = 'ascending' | 'descending';

const AppsTableContent = ({
  org,
  environment,
  search,
  setSearch,
  runningApps,
}: AppsTableContentProps) => {
  const { t } = useTranslation();
  const envTitle = useEnvironmentTitle(environment);
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const [period, setPeriod] = useQueryParamState<number>('period', DEFAULT_SEARCH_PARAMS.period);
  const periodDays = period ?? DEFAULT_SEARCH_PARAMS.period;
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection } | null>(null);

  const {
    data: errorMetrics,
    isPending: errorMetricsIsPending,
    error: errorMetricsError,
    isError: errorMetricsIsError,
  } = useErrorMetricsQuery(org, environment, ERROR_METRICS_RANGE_MINUTES, {
    hideDefaultError: true,
  });
  const {
    data: dailyMetrics,
    isPending: dailyMetricsIsPending,
    error: dailyMetricsError,
    isError: dailyMetricsIsError,
  } = useAppDailyMetricsQuery(org, environment, periodDays, { hideDefaultError: true });

  const rows = useMemo<AppRow[]>(() => {
    const metricsByApp = new Map(dailyMetrics?.apps.map((row) => [row.app, row]) ?? []);
    return runningApps[environment].map((app) => {
      const metrics = metricsByApp.get(app.app);
      const appErrorMetrics = errorMetrics?.filter((metric) => metric.appName === app.app) ?? [];
      return {
        app: app.app,
        version: app.version,
        instancesCreated: metrics?.instancesCreated ?? 0,
        instancesCreatedPreviousPeriod: metrics?.instancesCreatedPreviousPeriod ?? 0,
        instancesCompleted: metrics?.instancesCompleted ?? 0,
        secondsToCompleteP50: metrics?.secondsToCompleteP50 ?? null,
        lastInstanceCreatedOn: metrics?.lastInstanceCreatedOn ?? null,
        noUseMonths: noUseMonths(
          metrics?.lastInstanceCreatedOn ?? null,
          dailyMetrics?.observedSince ?? null,
          dailyMetrics?.metricDate ?? null,
        ),
        errorMetrics: appErrorMetrics,
        errorCount: appErrorMetrics.reduce((sum, metric) => sum + metric.count, 0),
      };
    });
  }, [runningApps, environment, dailyMetrics, errorMetrics]);

  const visibleRows = useMemo(() => {
    const filtered = rows.filter(
      (row) => !search || row.app.toLowerCase().includes(search.toLowerCase()),
    );
    return filtered.toSorted(sort ? compareBy(sort.column, sort.direction) : compareByDeviations);
  }, [rows, search, sort]);

  const toggleSort = (column: SortColumn) =>
    setSort((current) =>
      current?.column === column
        ? { column, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
        : {
            column,
            direction: column === 'app' || column === 'version' ? 'ascending' : 'descending',
          },
    );
  const sortState = (column: SortColumn): SortDirection | 'none' =>
    sort?.column === column ? sort.direction : 'none';

  return (
    <>
      {errorMetricsIsError &&
        (isAxiosError(errorMetricsError) && errorMetricsError.response?.status === 403 ? (
          <StudioAlert data-color='info' className={classes.errorAlert}>
            {t('admin.metrics.errors.missing_rights', { envTitle, orgName })}
          </StudioAlert>
        ) : (
          <StudioError className={classes.errorAlert}>
            {t('admin.metrics.errors.error')}
          </StudioError>
        ))}
      {dailyMetricsIsError &&
        (isAxiosError(dailyMetricsError) && dailyMetricsError.response?.status === 403 ? (
          <StudioAlert data-color='info' className={classes.errorAlert}>
            {t('admin.apps.metrics.missing_rights', { envTitle, orgName })}
          </StudioAlert>
        ) : (
          <StudioError className={classes.errorAlert}>{t('admin.apps.metrics.error')}</StudioError>
        ))}
      <MetricsStamp
        metricDate={dailyMetrics?.metricDate ?? null}
        computedAt={dailyMetrics?.computedAt ?? null}
      />
      <div className={classes.toolbar}>
        <StudioSearch
          className={classes.appSearch}
          value={search ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          label={t('admin.apps.search')}
        />
        <PeriodSelect value={periodDays} onChange={setPeriod} />
      </div>
      <AppsSummary rows={rows} periodDays={periodDays} />
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell sort={sortState('app')} onClick={() => toggleSort('app')}>
              {t('admin.apps.name')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell
              sort={sortState('version')}
              onClick={() => toggleSort('version')}
            >
              {t('admin.apps.version')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell
              sort={sortState('instancesCreated')}
              onClick={() => toggleSort('instancesCreated')}
              className={classes.numericHeaderCell}
            >
              {(dailyMetricsIsPending || errorMetricsIsPending) && (
                <StudioSpinner aria-label={t('admin.apps.metrics.loading')} />
              )}
              {t('admin.apps.instances', { days: periodDays })}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell
              sort={sortState('deviations')}
              onClick={() => toggleSort('deviations')}
              className={classes.numericHeaderCell}
            >
              {t('admin.apps.deviations')}
            </StudioTable.HeaderCell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {visibleRows.map((row) => (
            <StudioTable.Row key={row.app}>
              <StudioTable.Cell>
                <Link to={`${environment}/${row.app}`}>{row.app}</Link>
              </StudioTable.Cell>
              <StudioTable.Cell>{row.version}</StudioTable.Cell>
              <StudioTable.Cell className={classes.numericCell}>
                <InstancesCell row={row} />
              </StudioTable.Cell>
              <StudioTable.Cell className={classes.errorMetricsCell}>
                <DeviationsCell row={row} />
              </StudioTable.Cell>
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
    </>
  );
};

const InstancesCell = ({ row }: { row: AppRow }) => {
  const { t } = useTranslation();
  const typicalTime = formatTypicalTime(row.secondsToCompleteP50, t);
  return (
    <span className={classes.stack}>
      <span>{new Intl.NumberFormat('nb').format(row.instancesCreated)}</span>
      {typicalTime && (
        <span className={classes.subtle}>
          {t('admin.apps.typical_time', { duration: typicalTime })}
        </span>
      )}
    </span>
  );
};

const DeviationsCell = ({ row }: { row: AppRow }) => {
  const { t } = useTranslation();
  return (
    <div className={classes.errorMetricsCellContainer}>
      {row.errorMetrics.length === 0 && row.noUseMonths === 0 && (
        <span className={classes.subtle}>{t('admin.apps.deviations.none')}</span>
      )}
      {row.errorMetrics.map((metric) => (
        <Alert
          key={metric.name}
          color='danger'
          title={
            <>
              <span className={classes.count}>{metric.count.toString()}</span>
              {t(`admin.metrics.${metric.name}`)}
            </>
          }
          url={metric.logsUrl}
          className={classes.errorMetric}
        ></Alert>
      ))}
      {row.noUseMonths > 0 && (
        <StudioTag
          data-size='sm'
          color='warning'
          title={
            row.lastInstanceCreatedOn
              ? t('admin.apps.deviations.no_use_since', { date: row.lastInstanceCreatedOn })
              : t('admin.apps.deviations.no_use_never')
          }
        >
          {t('admin.apps.deviations.no_use', { months: row.noUseMonths })}
        </StudioTag>
      )}
    </div>
  );
};

/** Apps that need attention first: most errors, then longest without use, then by name. */
const compareByDeviations = (a: AppRow, b: AppRow): number =>
  b.errorCount - a.errorCount || b.noUseMonths - a.noUseMonths || a.app.localeCompare(b.app);

const compareBy =
  (column: SortColumn, direction: SortDirection) =>
  (a: AppRow, b: AppRow): number => {
    const sign = direction === 'ascending' ? 1 : -1;
    switch (column) {
      case 'app':
        return sign * a.app.localeCompare(b.app);
      case 'version':
        return sign * a.version.localeCompare(b.version, undefined, { numeric: true });
      case 'instancesCreated':
        return sign * (a.instancesCreated - b.instancesCreated) || a.app.localeCompare(b.app);
      case 'deviations':
        return sign * -compareByDeviations(a, b);
    }
  };

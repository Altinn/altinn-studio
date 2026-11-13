import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  StudioChip,
  StudioHeading,
  StudioParagraph,
  StudioSearch,
  StudioTableLocalPagination,
  StudioTag,
} from '@studio/components';
import type { Columns } from '@studio/components';
import { usePlatformMetrics } from 'admin/features/platform/hooks/usePlatformMetrics';
import { PlatformMetricsState } from 'admin/features/platform/components/PlatformMetricsState';
import { MetricsStamp } from 'admin/features/apps/components/MetricsStamp/MetricsStamp';
import { platformAppRows } from 'admin/features/platform/utils/platformMetrics';
import type { PlatformAppDailyMetrics } from 'admin/features/platform/types/PlatformAppDailyMetrics';
import { usePaginationTexts } from 'admin/features/platform/hooks/usePaginationTexts';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import classes from './AllApps.module.css';

export const AllApps = () => {
  const { environment, query } = usePlatformMetrics();
  return (
    <PlatformMetricsState query={query}>
      {(metrics) => <AllAppsWithData metrics={metrics} environment={environment} />}
    </PlatformMetricsState>
  );
};

type AllAppsWithDataProps = {
  metrics: PlatformAppDailyMetrics;
  environment: string;
};

const AllAppsWithData = ({ metrics, environment }: AllAppsWithDataProps) => {
  const { t } = useTranslation();
  const paginationTexts = usePaginationTexts();
  const [search, setSearch] = useQueryParamState<string>('appSearch', '');
  const [withoutUseOnly, setWithoutUseOnly] = useQueryParamState<boolean>('withoutUse', false);
  const rows = useMemo(() => platformAppRows(metrics), [metrics]);
  const withoutUseCount = rows.filter((row) => row.noUseMonths > 0).length;

  const visibleRows = useMemo(() => {
    const needle = (search ?? '').toLowerCase();
    return rows
      .filter((row) => !withoutUseOnly || row.noUseMonths > 0)
      .filter((row) => !needle || row.org.includes(needle) || row.app.includes(needle))
      .toSorted(
        (a, b) =>
          b.noUseMonths - a.noUseMonths || a.org.localeCompare(b.org) || a.app.localeCompare(b.app),
      );
  }, [rows, search, withoutUseOnly]);

  const columns: Columns = [
    {
      accessor: 'org',
      heading: t('admin.platform.all_apps.org'),
      sortable: true,
    },
    {
      accessor: 'app',
      heading: t('admin.platform.all_apps.app'),
      sortable: true,
      bodyCellFormatter: (orgAndApp: string) => {
        const [org, app] = orgAndApp.split('/');
        return <Link to={`/${org}/apps/${environment}/${app}`}>{app}</Link>;
      },
    },
    {
      accessor: 'noUseMonths',
      heading: t('admin.platform.all_apps.deviations'),
      sortable: true,
      headerCellClass: classes.numeric,
      bodyCellClass: classes.numeric,
      bodyCellFormatter: (months: number) =>
        months > 0 ? (
          <StudioTag data-size='sm' color='warning'>
            {t('admin.apps.deviations.no_use', { months })}
          </StudioTag>
        ) : (
          <span className={classes.subtle}>{t('admin.apps.deviations.none')}</span>
        ),
    },
  ];

  const tableRows = visibleRows.map((row) => ({
    id: `${row.org}/${row.app}`,
    org: row.org,
    app: `${row.org}/${row.app}`,
    noUseMonths: row.noUseMonths,
  }));

  return (
    <div className={classes.page}>
      <StudioHeading level={2} data-size='sm'>
        {t('admin.platform.all_apps.title', { environment })}
      </StudioHeading>
      <MetricsStamp
        metricDate={metrics.metricDate}
        computedAt={
          metrics.serviceOwners
            .map((owner) => owner.computedAt)
            .sort()
            .at(-1) ?? null
        }
      />
      <div className={classes.toolbar}>
        <div className={classes.chips} role='group' aria-label={t('admin.platform.all_apps.show')}>
          <span className={classes.subtle}>{t('admin.platform.all_apps.show')}</span>
          <StudioChip.Checkbox
            checked={Boolean(withoutUseOnly)}
            onChange={(e) => setWithoutUseOnly(e.target.checked)}
          >
            {t('admin.platform.all_apps.filter_without_use', { count: withoutUseCount })}
          </StudioChip.Checkbox>
        </div>
        <StudioSearch
          className={classes.search}
          value={search ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          label={t('admin.platform.all_apps.search')}
        />
      </div>
      <StudioParagraph data-size='sm' className={classes.subtle}>
        {withoutUseOnly
          ? t('admin.platform.all_apps.status_filtered', { count: visibleRows.length })
          : t('admin.platform.all_apps.status_all', { count: visibleRows.length })}
      </StudioParagraph>
      <StudioTableLocalPagination
        columns={columns}
        rows={tableRows}
        size='small'
        emptyTableFallback={
          <StudioParagraph data-size='sm'>
            {t('admin.platform.all_apps.no_results')}
          </StudioParagraph>
        }
        pagination={{ pageSizeOptions: [25, 50, 100], paginationTexts }}
      />
      <StudioParagraph data-size='sm' className={classes.subtle}>
        {t('admin.platform.all_apps.description')}
      </StudioParagraph>
    </div>
  );
};

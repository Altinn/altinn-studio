import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { StudioHeading, StudioParagraph, StudioTableLocalPagination } from '@studio/components';
import type { Columns } from '@studio/components';
import { usePlatformMetrics } from 'admin/features/platform/hooks/usePlatformMetrics';
import { PlatformMetricsState } from 'admin/features/platform/components/PlatformMetricsState';
import { PlatformSummary } from 'admin/features/platform/components/PlatformSummary/PlatformSummary';
import { MetricsStamp } from 'admin/features/apps/components/MetricsStamp/MetricsStamp';
import { platformSummary, serviceOwnerRows } from 'admin/features/platform/utils/platformMetrics';
import type { PlatformAppDailyMetrics } from 'admin/features/platform/types/PlatformAppDailyMetrics';
import { usePaginationTexts } from 'admin/features/platform/hooks/usePaginationTexts';
import { createSearchParams } from 'admin/constants/constants';
import classes from './ServiceOwners.module.css';

const formatNumber = (value: number): string => new Intl.NumberFormat('nb').format(value);

export const ServiceOwners = () => {
  const { environment, periodDays, query } = usePlatformMetrics();
  return (
    <PlatformMetricsState query={query}>
      {(metrics) => (
        <ServiceOwnersWithData
          metrics={metrics}
          environment={environment}
          periodDays={periodDays}
        />
      )}
    </PlatformMetricsState>
  );
};

type ServiceOwnersWithDataProps = {
  metrics: PlatformAppDailyMetrics;
  environment: string;
  periodDays: number;
};

const ServiceOwnersWithData = ({
  metrics,
  environment,
  periodDays,
}: ServiceOwnersWithDataProps) => {
  const { t } = useTranslation();
  const paginationTexts = usePaginationTexts();
  const rows = useMemo(() => serviceOwnerRows(metrics), [metrics]);
  const summary = useMemo(() => platformSummary(rows), [rows]);
  const latestComputedAt = metrics.serviceOwners
    .map((owner) => owner.computedAt)
    .sort()
    .at(-1);

  const columns: Columns = [
    {
      accessor: 'org',
      heading: t('admin.platform.service_owners.org'),
      sortable: true,
      bodyCellFormatter: (org: string) => (
        <Link to={`/${org}/apps${createSearchParams({ environment })}`}>{org}</Link>
      ),
    },
    {
      accessor: 'appCount',
      heading: t('admin.platform.service_owners.apps'),
      sortable: true,
      headerCellClass: classes.numeric,
      bodyCellClass: classes.numeric,
    },
    {
      accessor: 'instancesCreated',
      heading: t('admin.platform.service_owners.created', { days: periodDays }),
      sortable: true,
      headerCellClass: classes.numeric,
      bodyCellClass: classes.numeric,
      bodyCellFormatter: formatNumber,
    },
    {
      accessor: 'appsWithoutUse',
      heading: t('admin.platform.service_owners.apps_without_use'),
      sortable: true,
      headerCellClass: classes.numeric,
      bodyCellClass: classes.numeric,
    },
  ];

  const tableRows = rows
    .toSorted((a, b) => b.appCount - a.appCount || a.org.localeCompare(b.org))
    .map((row) => ({
      id: row.org,
      org: row.org,
      appCount: row.appCount,
      instancesCreated: row.instancesCreated,
      appsWithoutUse: row.appsWithoutUse,
    }));

  return (
    <div className={classes.page}>
      <StudioHeading level={2} data-size='sm'>
        {t('admin.platform.service_owners.title', { environment })}
      </StudioHeading>
      <MetricsStamp metricDate={metrics.metricDate} computedAt={latestComputedAt ?? null} />
      <PlatformSummary summary={summary} periodDays={periodDays} />
      <StudioTableLocalPagination
        columns={columns}
        rows={tableRows}
        size='small'
        emptyTableFallback={
          <StudioParagraph data-size='sm'>
            {t('admin.platform.service_owners.no_results')}
          </StudioParagraph>
        }
        pagination={{ pageSizeOptions: [25, 50, 100], paginationTexts }}
      />
      <StudioParagraph data-size='sm' className={classes.description}>
        {t('admin.platform.service_owners.description')}
      </StudioParagraph>
    </div>
  );
};

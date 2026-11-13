import { useTranslation } from 'react-i18next';
import type { PlatformSummary as Summary } from 'admin/features/platform/utils/platformMetrics';
import { percentChange, percentOf } from 'admin/features/apps/utils/appDeviations';
import classes from './PlatformSummary.module.css';

export type PlatformSummaryProps = {
  summary: Summary;
  periodDays: number;
};

const formatNumber = (n: number): string => new Intl.NumberFormat('nb').format(n);

/** The platform as a whole, before the table per service owner. */
export const PlatformSummary = ({ summary, periodDays }: PlatformSummaryProps) => {
  const { t } = useTranslation();
  const change = percentChange(summary.instancesCreated, summary.instancesCreatedPreviousPeriod);
  const withoutUseShare = percentOf(summary.appsWithoutUse, summary.apps);
  const completedShare = percentOf(summary.instancesCompleted, summary.instancesCreated);
  const tiles = [
    {
      label: t('admin.platform.summary.service_owners'),
      value: formatNumber(summary.serviceOwners),
      detail: t('admin.platform.summary.service_owners_active', {
        count: summary.serviceOwnersActive,
      }),
    },
    {
      label: t('admin.platform.summary.apps'),
      value: formatNumber(summary.apps),
      detail: t('admin.platform.summary.apps_in_use', { count: summary.appsInUse }),
    },
    {
      label: t('admin.platform.summary.created', { days: periodDays }),
      value: formatNumber(summary.instancesCreated),
      detail:
        change === null
          ? t('admin.platform.summary.created_change_none', { days: periodDays })
          : t('admin.platform.summary.created_change', {
              change: `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}`,
              days: periodDays,
            }),
    },
    {
      label: t('admin.platform.summary.completed', { days: periodDays }),
      value: formatNumber(summary.instancesCompleted),
      detail:
        completedShare === null
          ? t('admin.platform.summary.completed_share_none')
          : t('admin.platform.summary.completed_share', { percent: completedShare }),
    },
    {
      label: t('admin.platform.summary.apps_without_use'),
      value: formatNumber(summary.appsWithoutUse),
      detail: t('admin.platform.summary.apps_without_use_share', { percent: withoutUseShare ?? 0 }),
    },
  ];
  return (
    <dl className={classes.summary}>
      {tiles.map((tile) => (
        <div key={tile.label} className={classes.tile}>
          <dt className={classes.label}>{tile.label}</dt>
          <dd className={classes.value}>{tile.value}</dd>
          <dd className={classes.detail}>{tile.detail}</dd>
        </div>
      ))}
    </dl>
  );
};

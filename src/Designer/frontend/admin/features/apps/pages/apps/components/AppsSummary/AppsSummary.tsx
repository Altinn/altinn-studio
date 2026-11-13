import { useTranslation } from 'react-i18next';
import classes from './AppsSummary.module.css';
import { percentChange, percentOf } from 'admin/features/apps/utils/appDeviations';
import type { AppRow } from '../AppsTable';

export type AppsSummaryProps = {
  rows: AppRow[];
  periodDays: number;
};

const formatNumber = (n: number): string => new Intl.NumberFormat('nb').format(n);

/**
 * The numbers for the environment as a whole: the three the ticket asks for (apps, instances
 * created, instances completed) and how many apps need attention. Each tile says what period it
 * covers; the end of the period is the stamp's date.
 */
export const AppsSummary = ({ rows, periodDays }: AppsSummaryProps) => {
  const { t } = useTranslation();
  const created = rows.reduce((sum, row) => sum + row.instancesCreated, 0);
  const createdPrevious = rows.reduce((sum, row) => sum + row.instancesCreatedPreviousPeriod, 0);
  const completed = rows.reduce((sum, row) => sum + row.instancesCompleted, 0);
  const inUse = rows.filter((row) => row.instancesCreated > 0).length;
  const withErrors = rows.filter((row) => row.errorCount > 0).length;
  const withoutUse = rows.filter((row) => row.noUseMonths > 0).length;
  const change = percentChange(created, createdPrevious);
  const completedShare = percentOf(completed, created);

  const tiles = [
    {
      label: t('admin.apps.summary.apps'),
      value: formatNumber(rows.length),
      detail: t('admin.apps.summary.apps_in_use', { count: inUse, days: periodDays }),
    },
    {
      label: t('admin.apps.summary.created', { days: periodDays }),
      value: formatNumber(created),
      detail:
        change === null
          ? t('admin.apps.summary.created_change_none', { days: periodDays })
          : t('admin.apps.summary.created_change', {
              change: `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}`,
              days: periodDays,
            }),
    },
    {
      label: t('admin.apps.summary.completed', { days: periodDays }),
      value: formatNumber(completed),
      detail:
        completedShare === null
          ? t('admin.apps.summary.completed_share_none')
          : t('admin.apps.summary.completed_share', { percent: completedShare }),
    },
    {
      label: t('admin.apps.summary.deviations'),
      value: formatNumber(rows.filter((row) => row.errorCount > 0 || row.noUseMonths > 0).length),
      detail: t('admin.apps.summary.deviations_detail', { errors: withErrors, noUse: withoutUse }),
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

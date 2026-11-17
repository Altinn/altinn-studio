import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { StudioSpinner } from '@studio/components';
import { Alert } from 'admin/features/apps/components/Alert/Alert';
import { useAppDailyMetricsDetailsQuery } from 'admin/features/apps/hooks/queries/useAppDailyMetricsDetailsQuery';
import { formatTypicalTime } from 'admin/features/apps/utils/appDeviations';
import { DEFAULT_SEARCH_PARAMS } from 'admin/constants/constants';
import classes from './TypicalTimeMetric.module.css';

export type TypicalTimeMetricProps = {
  org: string;
  environment: string;
  app: string;
};

/**
 * The typical time from start to completion, as the nightly collection stored it: the median per
 * day, weighted over the last 30 stored days. Not from the card's own range, which the stored
 * numbers cannot follow below a day, so the box says which period it covers.
 */
export const TypicalTimeMetric = ({ org, environment, app }: TypicalTimeMetricProps) => {
  const { t } = useTranslation();
  const days = DEFAULT_SEARCH_PARAMS.period;
  const { data, isPending, isError, error } = useAppDailyMetricsDetailsQuery(
    org,
    environment,
    app,
    days,
    { hideDefaultError: true },
  );

  if (isPending) {
    return <StudioSpinner aria-label={t('admin.metrics.typical_time.loading')} />;
  }
  if (isError) {
    const forbidden = isAxiosError(error) && error.response?.status === 403;
    return (
      <Alert
        color='info'
        title={t('admin.metrics.typical_time')}
        count='–'
        className={classes.metric}
        footer={
          <p className={classes.note}>
            {forbidden
              ? t('admin.metrics.typical_time.missing_rights')
              : t('admin.metrics.typical_time.error')}
          </p>
        }
      />
    );
  }

  const typicalTime = formatTypicalTime(data.metrics.secondsToCompleteP50, t);
  return (
    <Alert
      color='info'
      title={t('admin.metrics.typical_time')}
      count={typicalTime ?? '–'}
      className={classes.metric}
      footer={
        <p className={classes.note}>
          {typicalTime
            ? t('admin.metrics.typical_time.note', {
                days,
                completed: new Intl.NumberFormat('nb').format(data.metrics.instancesCompleted),
              })
            : t('admin.metrics.typical_time.none', { days })}
        </p>
      }
    />
  );
};

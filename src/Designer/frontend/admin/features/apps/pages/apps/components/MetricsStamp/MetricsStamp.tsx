import { StudioParagraph, StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';
import classes from './MetricsStamp.module.css';

export type MetricsStampProps = {
  metricDate: string | null;
  computedAt: string | null;
};

const formatDay = (isoDate: string): string =>
  new Intl.DateTimeFormat('nb', { dateStyle: 'long' }).format(new Date(isoDate));

/**
 * Which day the daily numbers describe and when the nightly collection ran. Without it nobody
 * could tell a number from last night from one from last week.
 */
export const MetricsStamp = ({ metricDate, computedAt }: MetricsStampProps) => {
  const { t } = useTranslation();
  return (
    <StudioParagraph data-size='sm' className={classes.stamp}>
      {metricDate ? (
        t('admin.apps.stamp', {
          date: formatDay(metricDate),
          updated: computedAt ? formatDateAndTime(computedAt) : '-',
        })
      ) : (
        <StudioTag data-size='sm' color='warning'>
          {t('admin.apps.stamp.no_data')}
        </StudioTag>
      )}{' '}
      {t('admin.apps.stamp.errors_realtime')}
    </StudioParagraph>
  );
};

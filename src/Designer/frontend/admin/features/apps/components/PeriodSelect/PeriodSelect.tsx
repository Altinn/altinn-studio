import { StudioSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PERIOD_OPTIONS_DAYS } from 'admin/constants/constants';
import classes from './PeriodSelect.module.css';

export type PeriodSelectProps = {
  value: number;
  onChange: (days: number) => void;
};

/** The period the daily metrics are summed over, in days. */
export const PeriodSelect = ({ value, onChange }: PeriodSelectProps) => {
  const { t } = useTranslation();
  return (
    <StudioSelect
      label={t('admin.apps.period')}
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      className={classes.select}
    >
      {PERIOD_OPTIONS_DAYS.map((days) => (
        <StudioSelect.Option key={days} value={String(days)}>
          {t('admin.apps.period.option', { days })}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};

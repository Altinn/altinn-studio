import React, { ReactNode, useState } from 'react';
import classes from './DateAndTimeRow.module.css';
import { ErrorMessage, Textfield } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { isValidDate, isValidTime } from 'app-development/utils/dateUtils';

export type DateAndTimeRowProps = {
  dateLabel: string;
  dateValue: string;
  onSave: (newDate: string) => void;
  isDateValid?: boolean;
  invalidDateErrorMessage?: string;
};

export const DateAndTimeRow = ({
  dateLabel,
  dateValue,
  onSave,
  isDateValid = true,
  invalidDateErrorMessage,
}: DateAndTimeRowProps): ReactNode => {
  const { t } = useTranslation();

  const [date, setDate] = useState(dateValue); //dateValue?.split('T')[0] ?? '');
  const [time, setTime] = useState(dateValue?.split('T')[1]?.substring(0, 5) ?? '');
  const [hasDateError, setHasDateError] = useState(false);
  const [hasTimeError, setHasTimeError] = useState(false);

  /**
   * If there is an error, an error message is shown and when
   * there is no error, the new date is saved.
   */
  const handleBlur = () => {
    const dateInvalid = !isValidDate(date);
    const timeInvalid = !isValidTime(time);

    if (dateInvalid || timeInvalid) {
      console.log('if');
      setHasDateError(dateInvalid);
      setHasTimeError(timeInvalid);
      onSave(dateValue);
    } else {
      console.log('else');

      const date2 = new Date(`${date}T${time || '00:00'}:00Z`).toISOString();
      onSave(date2);
    }
  };

  const handleChangeDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasDateError(false);
    setDate(e.target.value);
  };

  const handleChangeTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasTimeError(false);
    setTime(e.target.value);
  };

  const getErrorMessage = () => {
    if (hasTimeError || hasDateError) {
      return t('settings_modal.setup_tab_invalid_date_or_time');
    }
    if (!isDateValid && invalidDateErrorMessage) {
      return invalidDateErrorMessage;
    }
    return '';
  };

  return (
    <div className={classes.wrapper}>
      {/* TODO - replace with new Date and Time components */}
      <div className={classes.inputWrapper}>
        <Textfield
          type='datetime-local'
          value={date}
          onChange={handleChangeDate}
          label={dateLabel}
          size='small'
          onBlur={handleBlur}
          //error={hasDateError || (!isDateValid && invalidDateErrorMessage !== undefined)}
        />
        {/*c
        <Textfield
          type='date'
          value={date}
          onChange={handleChangeDate}
          label={dateLabel}
          size='small'
          onBlur={handleBlur}
          error={hasDateError || (!isDateValid && invalidDateErrorMessage !== undefined)}
        />
        <Textfield
          type='time'
          value={time}
          onChange={handleChangeTime}
          label={t('settings_modal.setup_tab_time_label')}
          size='small'
          onBlur={handleBlur}
          error={hasTimeError || (!isDateValid && invalidDateErrorMessage !== undefined)}
  />*/}
      </div>
      {/*

      <ErrorMessage className={classes.errorMessage} size='small'>
        {getErrorMessage()}
      </ErrorMessage> />*/}
    </div>
  );
};

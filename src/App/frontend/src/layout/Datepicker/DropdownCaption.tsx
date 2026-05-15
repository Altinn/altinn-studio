import React from 'react';
import { formatMonthDropdown, useDayPicker } from 'react-day-picker';
import type { MonthCaptionProps } from 'react-day-picker';

import { Select } from '@digdir/designsystemet-react';
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon } from '@navikt/aksel-icons';
import { addYears, setMonth, setYear, startOfMonth, subYears } from 'date-fns';

import { Button } from 'src/app-components/Button/Button';
import styles from 'src/app-components/Datepicker/Calendar.module.css';
import { useDatePickerClose } from 'src/app-components/Datepicker/DatepickerDialog';
import { getDateLib, getMonths, getYears } from 'src/app-components/Datepicker/utils/dateHelpers';
import { translationKey } from 'src/AppComponentsBridge';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import comboboxClasses from 'src/styles/combobox.module.css';

type DropdownCaptionProps = MonthCaptionProps & {
  minDate?: Date;
  maxDate?: Date;
};

export const DropdownCaption = ({ calendarMonth, id, minDate, maxDate }: DropdownCaptionProps) => {
  const { goToMonth, nextMonth, previousMonth } = useDayPicker();
  const { langAsString } = useLanguage();
  const languageLocale = useCurrentLanguage();
  const dateLib = getDateLib(languageLocale ?? 'nb');
  const onClose = useDatePickerClose();

  const handleYearChange = (year: string) => {
    const newMonth = setYear(startOfMonth(calendarMonth.date), Number(year));
    if (minDate && newMonth < startOfMonth(minDate)) {
      goToMonth(startOfMonth(minDate));
    } else if (maxDate && newMonth > startOfMonth(maxDate)) {
      goToMonth(startOfMonth(maxDate));
    } else {
      goToMonth(newMonth);
    }
  };

  const handleMonthChange = (month: string) => {
    goToMonth(setMonth(startOfMonth(calendarMonth.date), Number(month)));
  };
  const fromDate = minDate ?? subYears(calendarMonth.date, 100);
  const toDate = maxDate ?? addYears(calendarMonth.date, 100);

  const isPrevMonthDisabled = !previousMonth || (minDate && startOfMonth(previousMonth) < startOfMonth(minDate));
  const isNextMonthDisabled = !nextMonth || (maxDate && startOfMonth(nextMonth) > startOfMonth(maxDate));
  const years = getYears(fromDate, toDate, calendarMonth.date.getFullYear()).reverse();
  const months = getMonths(fromDate, toDate, calendarMonth.date);

  return (
    <div className={styles.datepickerCaption}>
      <Button
        icon={true}
        color='second'
        variant='tertiary'
        aria-label={translationKey('date_picker.aria_label_left_arrow')}
        disabled={isPrevMonthDisabled}
        onClick={() => previousMonth && goToMonth(previousMonth)}
      >
        <ArrowLeftIcon />
      </Button>
      <div className={styles.datepickerDropdowns}>
        <Select
          style={{ width: '150px' }}
          id={id}
          data-size='sm'
          value={calendarMonth.date.getMonth().toString()}
          onChange={(e) => handleMonthChange(e.target.value)}
          aria-label={langAsString('date_picker.aria_label_month_dropdown')}
        >
          {months.map((date) => (
            <Select.Option
              key={date.getMonth()}
              value={date.getMonth().toString()}
            >
              {langAsString(formatMonthDropdown(date, dateLib))}
            </Select.Option>
          ))}
        </Select>
        <Select
          style={{ width: '100px' }}
          id={id}
          data-size='sm'
          value={calendarMonth.date.getFullYear().toString()}
          onChange={(e) => handleYearChange(e.target.value)}
          aria-label={langAsString('date_picker.aria_label_year_dropdown')}
          className={comboboxClasses.container}
        >
          {years.map((date) => (
            <Select.Option
              key={date.getFullYear().toString()}
              value={date.getFullYear().toString()}
            >
              {langAsString(date.getFullYear().toString())}
            </Select.Option>
          ))}
        </Select>
      </div>
      <Button
        icon={true}
        color='second'
        variant='tertiary'
        aria-label={translationKey('date_picker.aria_label_right_arrow')}
        disabled={isNextMonthDisabled}
        onClick={() => nextMonth && goToMonth(nextMonth)}
      >
        <ArrowRightIcon />
      </Button>
      {onClose && (
        <div className={styles.datepickerCloseButton}>
          <Button
            icon={true}
            color='second'
            variant='tertiary'
            aria-label={translationKey('general.close')}
            onClick={onClose}
          >
            <XMarkIcon />
          </Button>
        </div>
      )}
    </div>
  );
};

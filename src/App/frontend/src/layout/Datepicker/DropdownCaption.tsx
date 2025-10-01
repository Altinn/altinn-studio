import React from 'react';
import { formatMonthDropdown, useDayPicker } from 'react-day-picker';
import type { MonthCaptionProps } from 'react-day-picker';

import { Select } from '@digdir/designsystemet-react';
import { ArrowLeftIcon, ArrowRightIcon } from '@navikt/aksel-icons';
import { addYears, max, min, setMonth, setYear, startOfMonth, subYears } from 'date-fns';

import { Button } from 'src/app-components/Button/Button';
import styles from 'src/app-components/Datepicker/Calendar.module.css';
import { getMonths, getYears } from 'src/app-components/Datepicker/DatePickerHelpers';
import { getDateLib } from 'src/app-components/Datepicker/utils/dateHelpers';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import comboboxClasses from 'src/styles/combobox.module.css';

export const DropdownCaption = ({ calendarMonth, id }: MonthCaptionProps) => {
  const { goToMonth, nextMonth, previousMonth } = useDayPicker();
  const { langAsString } = useLanguage();
  const languageLocale = useCurrentLanguage();
  const dateLib = getDateLib(languageLocale ?? 'nb');

  const handleYearChange = (year: string) => {
    const newMonth = setYear(startOfMonth(calendarMonth.date), Number(year));
    goToMonth(startOfMonth(min([max([newMonth])])));
  };

  const handleMonthChange = (month: string) => {
    goToMonth(setMonth(startOfMonth(calendarMonth.date), Number(month)));
  };

  const fromDate = subYears(calendarMonth.date, 100);
  const toDate = addYears(calendarMonth.date, 100);

  const years = getYears(fromDate, toDate, calendarMonth.date.getFullYear()).reverse();
  const months = getMonths(fromDate, toDate, calendarMonth.date);

  return (
    <div className={styles.dropdownCaption}>
      <Button
        icon={true}
        color='second'
        variant='tertiary'
        aria-label={langAsString('date_picker.aria_label_left_arrow')}
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
      >
        <ArrowLeftIcon />
      </Button>
      <div style={{ display: 'flex', gap: '8px' }}>
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
        aria-label={langAsString('date_picker.aria_label_right_arrow')}
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
      >
        <ArrowRightIcon />
      </Button>
    </div>
  );
};

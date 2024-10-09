import React from 'react';
import { formatMonthDropdown, useDayPicker } from 'react-day-picker';
import type { MonthCaptionProps } from 'react-day-picker';

import { Button, Combobox } from '@digdir/designsystemet-react';
import { ArrowLeftIcon, ArrowRightIcon } from '@navikt/aksel-icons';
import { addYears, max, min, setMonth, setYear, startOfMonth, subYears } from 'date-fns';

import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import styles from 'src/layout/Datepicker/Calendar.module.css';
import { getMonths, getYears } from 'src/layout/Datepicker/DatePickerHelpers';
import comboboxClasses from 'src/styles/combobox.module.css';
import { getLocale } from 'src/utils/dateHelpers';

export const DropdownCaption = ({ calendarMonth, id }: MonthCaptionProps) => {
  const { goToMonth, nextMonth, previousMonth } = useDayPicker();
  const { langAsString } = useLanguage();
  const isMobile = useIsMobile();
  const languageLocale = useCurrentLanguage();
  const currentLocale = getLocale(languageLocale ?? 'nb');

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
  const yearDropdownLabel = langAsString('date_picker.aria_label_year_dropdown');
  const MonthDropdownLabel = langAsString('date_picker.aria_label_month_dropdown');
  return (
    <>
      <div className={styles.dropdownCaption}>
        <Button
          icon={true}
          color='second'
          variant='tertiary'
          aria-label={langAsString('date_picker.aria_label_left_arrow')}
          disabled={!previousMonth}
          onClick={() => previousMonth && goToMonth(previousMonth)}
          size='small'
        >
          <ArrowLeftIcon />
        </Button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Combobox
            style={{ width: '150px' }}
            id={id}
            size='small'
            value={[calendarMonth.date.getMonth().toString()]}
            onValueChange={(months) => handleMonthChange(months[0])}
            aria-label={MonthDropdownLabel}
            className={comboboxClasses.container}
            portal={!isMobile}
          >
            <Combobox.Empty>
              <Lang id={'form_filler.no_options_found'} />
            </Combobox.Empty>
            {months.map((value) => (
              <Combobox.Option
                key={value.getMonth()}
                value={value.getMonth().toString()}
                displayValue={formatMonthDropdown(value.getMonth(), currentLocale)}
              >
                <Lang id={formatMonthDropdown(value.getMonth(), currentLocale)} />
              </Combobox.Option>
            ))}
          </Combobox>
          <Combobox
            style={{ width: '100px' }}
            id={id}
            size='small'
            value={[calendarMonth.date.getFullYear().toString()]}
            onValueChange={(years) => handleYearChange(years[0])}
            aria-label={yearDropdownLabel}
            className={comboboxClasses.container}
            portal={!isMobile}
          >
            <Combobox.Empty>
              <Lang id={'form_filler.no_options_found'} />
            </Combobox.Empty>
            {years.map((date) => (
              <Combobox.Option
                key={date.getFullYear().toString()}
                value={date.getFullYear().toString()}
                displayValue={date.getFullYear().toString()}
              >
                <Lang id={date.getFullYear().toString()} />
              </Combobox.Option>
            ))}
          </Combobox>
        </div>
        <Button
          icon={true}
          color='second'
          variant='tertiary'
          aria-label={langAsString('date_picker.aria_label_right_arrow')}
          disabled={!nextMonth}
          onClick={() => nextMonth && goToMonth(nextMonth)}
          size='small'
        >
          <ArrowRightIcon />
        </Button>
      </div>
    </>
  );
};

export default DropdownCaption;

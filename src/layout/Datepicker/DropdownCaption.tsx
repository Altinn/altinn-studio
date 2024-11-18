import React from 'react';
import { formatMonthDropdown, useDayPicker } from 'react-day-picker';
import type { MonthCaptionProps } from 'react-day-picker';

import { Combobox } from '@digdir/designsystemet-react';
import { ArrowLeftIcon, ArrowRightIcon } from '@navikt/aksel-icons';
import { addYears, max, min, setMonth, setYear, startOfMonth, subYears } from 'date-fns';

import { Button } from 'src/app-components/button/Button';
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
            aria-label={langAsString('date_picker.aria_label_month_dropdown')}
            className={comboboxClasses.container}
            portal={!isMobile}
          >
            <Combobox.Empty>
              <Lang id={'form_filler.no_options_found'} />
            </Combobox.Empty>
            {months.map((date) => (
              <Combobox.Option
                ref={scrollToIfSelected(date.getMonth() === calendarMonth.date.getMonth())}
                key={date.getMonth()}
                value={date.getMonth().toString()}
                displayValue={formatMonthDropdown(date.getMonth(), currentLocale)}
              >
                <Lang id={formatMonthDropdown(date.getMonth(), currentLocale)} />
              </Combobox.Option>
            ))}
          </Combobox>
          <Combobox
            style={{ width: '100px' }}
            id={id}
            size='small'
            value={[calendarMonth.date.getFullYear().toString()]}
            onValueChange={(years) => handleYearChange(years[0])}
            aria-label={langAsString('date_picker.aria_label_year_dropdown')}
            className={comboboxClasses.container}
            portal={!isMobile}
          >
            <Combobox.Empty>
              <Lang id={'form_filler.no_options_found'} />
            </Combobox.Empty>
            {years.map((date) => (
              <Combobox.Option
                ref={scrollToIfSelected(date.getFullYear() === calendarMonth.date.getFullYear())}
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
        >
          <ArrowRightIcon />
        </Button>
      </div>
    </>
  );
};

/**
 * This is a workaround to make sure that the selected option is visible when opening the dropdown see: https://github.com/Altinn/app-frontend-react/issues/2637
 * The ref attribute will call this function with the option element, and this will try to scroll it into view once.
 * When it succeeds, we set a 'data-scroll' attribute to make sure it does not keep trying so the user can scroll as they please.
 */
function scrollToIfSelected(selected: boolean) {
  return selected
    ? (el: HTMLButtonElement | null) => {
        if (
          el &&
          el.parentElement &&
          // The option list seems to first render with unbounded height and later rendering with scroll-bars, we need to check again when the height changes
          el.getAttribute('data-scroll-element-height') !== `${el.parentElement.clientHeight}`
        ) {
          el.parentElement.scrollTop = el.offsetTop;
          if (
            el.offsetTop == 0 || // no scrolling necessary
            el.parentElement.scrollHeight - el.parentElement.clientHeight == 0 || // container does not have scroll-bars
            (el.offsetTop > 0 && el.parentElement.scrollTop > 0) // check that we have actually scrolled
          ) {
            el.setAttribute('data-scroll-element-height', `${el.parentElement.clientHeight}`);
          }
        }
      }
    : undefined;
}

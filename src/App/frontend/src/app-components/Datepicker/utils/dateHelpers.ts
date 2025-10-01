import { DateLib } from 'react-day-picker';

import { endOfDay, format, formatDate, formatISO, isValid, parse, parseISO, startOfDay } from 'date-fns';
import type { Locale } from 'date-fns/locale';

import { locales } from 'src/app-components/Datepicker/utils/dateLocales';
import { DateFlags } from 'src/types';

export const DatepickerMinDateDefault = '1900-01-01T00:00:00Z';
export const DatepickerMaxDateDefault = '2100-01-01T23:59:59Z';
export const DatepickerFormatDefault = 'dd.MM.yyyy';
export const PrettyDateAndTime = 'dd.MM.yyyy / HH:mm';

/**
 * Moment used a non-standard format for dates, this is a work-around to prevent breaking changes
 * @deprecated
 */
function convertLegacyFormat(format: string): string {
  if (format === 'DD.MM.YYYY') {
    return 'dd.MM.yyyy';
  }
  if (format === 'DD/MM/YYYY') {
    return 'dd/MM/yyyy';
  }
  if (format === 'YYYY-MM-DD') {
    return 'yyyy-MM-dd';
  }
  return format;
}

export function getDateFormat(format?: string, selectedLanguage = 'nb'): string {
  if (format) {
    return convertLegacyFormat(format);
  }
  return getLocale(selectedLanguage).formatLong?.date({ width: 'short' }) || DatepickerFormatDefault;
}

export function getSaveFormattedDateString(date: Date | null, timestamp: boolean) {
  if (date && isValid(date)) {
    return (
      (!timestamp ? formatISO(date, { representation: 'date' }) : formatISO(date, { representation: 'complete' })) ?? ''
    );
  }
  return null;
}

export function getDateConstraint(dateOrFlag: string | DateFlags | undefined, constraint: 'min' | 'max'): Date {
  const shiftTime = constraint === 'min' ? startOfDay : endOfDay;

  if (dateOrFlag === DateFlags.Today) {
    return shiftTime(new Date());
  }
  if (dateOrFlag === DateFlags.Yesterday) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return shiftTime(date);
  }
  if (dateOrFlag === DateFlags.Tomorrow) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return shiftTime(date);
  }
  if (dateOrFlag === DateFlags.OneYearAgo) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return shiftTime(date);
  }
  if (dateOrFlag === DateFlags.OneYearFromNow) {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return shiftTime(date);
  }

  const date = strictParseISO(dateOrFlag);
  if (date && isValid(date)) {
    return shiftTime(date);
  }
  if (constraint === 'min') {
    return shiftTime(parseISO(DatepickerMinDateDefault));
  } else {
    return shiftTime(parseISO(DatepickerMaxDateDefault));
  }
}

export function formatISOString(isoString: string | undefined, format: string, locale?: Locale): string | null {
  const date = strictParseISO(isoString);

  if (date && isValid(date)) {
    return formatDate(date, format, { locale });
  } else {
    return null;
  }
}

export function isDate(date: string): boolean {
  return !isNaN(new Date(date).getTime());
}

export function getLocale(language: string): Locale {
  return locales[language] ?? locales.nb;
}

export function getDateLib(language: string) {
  return new DateLib({ locale: getLocale(language) });
}

/**
 * The date-fns parseISO function is a bit too lax for us, and will parse e.g. '01' as the date '0100-01-01',
 * this function requires at least a full date to parse successfully.
 * This prevents the value in the Datepicker input from changing while typing.
 * It returns either a valid date or null
 */
export function strictParseISO(isoString: string | undefined): Date | null {
  const minimumDate = 'yyyy-MM-dd';
  if (!isoString || isoString.length < minimumDate.length) {
    return null;
  }
  const date = parseISO(isoString);
  return isValid(date) ? date : null;
}

/**
 * The format function is a bit too lax, and will parse '01/01/1' (format: 'dd/MM/yyyy', which requires full year) as '01/01/0001',
 * this function requires that the parsed date when formatted using the same format is equal to the input.
 * This prevents the value in the Datepicker input from changing while typing.
 */
export function strictParseFormat(formattedDate: string | undefined, formatString: string): Date | null {
  if (!formattedDate) {
    return null;
  }
  const date = parse(formattedDate, formatString, new Date());
  const newFormattedDate = isValid(date) ? format(date, formatString) : undefined;
  return newFormattedDate && newFormattedDate === formattedDate ? date : null;
}

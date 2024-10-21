import { endOfDay, formatDate, formatISO, isValid, parseISO, startOfDay } from 'date-fns';
import type { Locale } from 'date-fns/locale';

import { DateFlags } from 'src/types';
import { locales } from 'src/utils/dateLocales';

export const DatepickerMinDateDefault = '1900-01-01T00:00:00Z';
export const DatepickerMaxDateDefault = '2100-01-01T23:59:59Z';
export const DatepickerFormatDefault = 'dd.MM.yyyy';
export const DatepickerSaveFormatTimestamp = "yyyy-MM-dd'T'HH:mm:ssXXXXX";
export const PrettyDateAndTime = 'dd.MM.yyyy HH.mm.ss';
export const DatepickerSaveFormatNoTimestamp = 'yyyy-MM-dd';

export type DateResult =
  | {
      isValid: true;
      date: Date;
      input: undefined;
    }
  | {
      isValid: false;
      date: null;
      input: string;
    };

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

  const { date, isValid } = parseISOString(dateOrFlag);
  if (isValid) {
    return shiftTime(date);
  }
  if (constraint === 'min') {
    return shiftTime(parseISO(DatepickerMinDateDefault));
  } else {
    return shiftTime(parseISO(DatepickerMaxDateDefault));
  }
}

export function formatISOString(isoString: string | undefined, format: string, locale?: Locale): string | null {
  const isoDate = parseISOString(isoString).date;

  if (isoDate) {
    return formatDate(isoDate, format, { locale });
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

export function parseISOString(isoString: string | undefined): DateResult {
  const date = parseISO(isoString ?? '');
  if (isValid(date)) {
    return {
      isValid: true,
      date,
      input: undefined,
    };
  } else {
    return {
      isValid: false,
      date: null,
      input: isoString ?? '',
    };
  }
}

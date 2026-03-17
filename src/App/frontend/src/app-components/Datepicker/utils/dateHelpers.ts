import { DateLib } from 'react-day-picker';

import {
  endOfDay,
  format,
  formatDate,
  formatISO,
  isSameYear,
  isValid,
  parse,
  parseISO,
  setMonth,
  setYear,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import type { Locale } from 'date-fns/locale';

import { locales } from 'src/app-components/Datepicker/utils/dateLocales';

export enum DateFlags {
  Today = 'today',
  Yesterday = 'yesterday',
  Tomorrow = 'tomorrow',
  OneYearAgo = 'oneYearAgo',
  OneYearFromNow = 'oneYearFromNow',
}

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

const UNICODE_TOKENS = /[^a-zA-Z0-9]+/g;
export type Token = keyof typeof tokenOptions;

const tokenOptions = {
  G: { era: 'short', numeric: false },
  GG: { era: 'short', numeric: false },
  GGG: { era: 'short', numeric: false },
  GGGG: { era: 'long', numeric: false },
  GGGGG: { era: 'narrow', numeric: false },
  y: { year: 'numeric', numeric: true },
  yy: { year: '2-digit', numeric: true },
  yyy: { year: 'numeric', numeric: true },
  yyyy: { year: 'numeric', numeric: true },
  u: { year: 'numeric', numeric: true },
  uu: { year: 'numeric', numeric: true },
  uuu: { year: 'numeric', numeric: true },
  uuuu: { year: 'numeric', numeric: true },
  M: { month: 'numeric', numeric: true },
  MM: { month: '2-digit', numeric: true },
  MMM: { month: 'short', numeric: false },
  MMMM: { month: 'long', numeric: false },
  MMMMM: { month: 'narrow', numeric: false },
  d: { day: 'numeric', numeric: true },
  dd: { day: '2-digit', numeric: true },
  E: { weekday: 'short', numeric: false },
  EE: { weekday: 'short', numeric: false },
  EEE: { weekday: 'short', numeric: false },
  EEEE: { weekday: 'long', numeric: false },
  EEEEE: { weekday: 'narrow', numeric: false },
  a: { hour12: true, hour: '2-digit', numeric: false },
  h: { hour: 'numeric', hourCycle: 'h12', numeric: true },
  hh: { hour: '2-digit', hourCycle: 'h12', numeric: true },
  H: { hour: 'numeric', hourCycle: 'h23', numeric: true },
  HH: { hour: '2-digit', hourCycle: 'h23', numeric: true },
  m: { minute: 'numeric', numeric: true },
  mm: { minute: '2-digit', numeric: true },
  s: { second: 'numeric', numeric: true },
  ss: { second: '2-digit', numeric: true },
  S: { fractionalSecondDigits: 1, numeric: true },
  SS: { fractionalSecondDigits: 2, numeric: true },
  SSS: { fractionalSecondDigits: 3, numeric: true },
} satisfies Record<
  string,
  Intl.DateTimeFormatOptions & {
    numeric: boolean;
  }
>;

/**
 * This will accept a Unicode date format and figure out if 'inputMode: numeric' can be used for an input field when
 * combined with a pattern format in react-number-format. When the numeric mode is set, the mobile OS will show a
 * strictly numeric keyboard (with no punctuation possible, at least on iOS). Since react-number-format fills in the
 * separators for you automatically, there is no need for the user to actually type them, so we can give the user
 * a better keyboard for these inputs.
 *
 * @see https://github.com/s-yadav/react-number-format/issues/189
 * @see getFormatAsPatternFormat
 */
export function dateFormatCanBeNumericInReactPatternFormat(format: string): boolean {
  const tokens = format.split(UNICODE_TOKENS) as Token[];
  for (const token of tokens) {
    if (!tokenOptions[token] || !tokenOptions[token].numeric) {
      return false;
    }
  }

  return true;
}

/**
 * Convert the date picker format to a react-number-format pattern format
 */
export function getFormatAsPatternFormat(datePickerFormat: string): string {
  return datePickerFormat.replaceAll(/[dmy]/gi, '#');
}

export const getMonths = (start: Date, end: Date, current: Date): Date[] => {
  const dropdownMonths: Date[] = [];

  if (isSameYear(start, end)) {
    const date = startOfMonth(start);
    for (let month = start.getMonth(); month <= end.getMonth(); month++) {
      dropdownMonths.push(setMonth(date, month));
    }
  } else if (isSameYear(current, end)) {
    const date = startOfMonth(new Date());
    for (let month = 0; month <= end.getMonth(); month++) {
      dropdownMonths.push(setMonth(date, month));
    }
  } else if (isSameYear(current, start)) {
    const date = startOfMonth(start);
    for (let month = date.getMonth(); month <= 11; month++) {
      dropdownMonths.push(setMonth(date, month));
    }
  } else {
    const date = startOfMonth(new Date());
    for (let month = 0; month <= 11; month++) {
      dropdownMonths.push(setMonth(date, month));
    }
  }

  if (!dropdownMonths.map((d) => d.getMonth()).includes(current.getMonth())) {
    dropdownMonths.push(current);
  }
  dropdownMonths.sort((a, b) => a.getMonth() - b.getMonth());

  return dropdownMonths;
};

export const getYears = (start: Date, end: Date, currentYear: number): Date[] => {
  const years: Date[] = [];
  const fromYear = start.getFullYear();
  const toYear = end.getFullYear();
  for (let year = fromYear; year <= toYear; year++) {
    years.push(setYear(startOfYear(new Date()), year));
  }

  if (fromYear > currentYear || toYear < currentYear) {
    years.push(setYear(startOfYear(new Date()), currentYear));
  }

  years.sort((a, b) => a.getFullYear() - b.getFullYear());
  return years;
};

import moment from 'moment';

import { DateFlags } from 'src/types';

export const DatepickerMinDateDefault = '1900-01-01T12:00:00.000Z';
export const DatepickerMaxDateDefault = '2100-01-01T12:00:00.000Z';
export const DatepickerFormatDefault = 'DD.MM.YYYY';
export const DatepickerSaveFormatTimestamp = 'YYYY-MM-DDThh:mm:ss.sssZ';
export const PrettyDateAndTime = 'DD.MM.YYYY HH.mm.SS';
export const DatepickerSaveFormatNoTimestamp = 'YYYY-MM-DD';

export function getISOString(potentialDate: string | undefined): string | undefined {
  if (!potentialDate) {
    return undefined;
  }

  const momentDate = moment(potentialDate);
  momentDate.set('hour', 12).set('minute', 0).set('second', 0).set('millisecond', 0);
  return momentDate.isValid() ? momentDate.toISOString() : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const locale = window.navigator?.language || (window.navigator as any)?.userLanguage || 'nb';
moment.locale(locale);

export function getDateFormat(format?: string, selectedLanguage = 'nb'): string {
  if (format) {
    return format;
  }
  return moment.localeData(selectedLanguage).longDateFormat('L') || DatepickerFormatDefault;
}

export function getDateString(date: moment.Moment | null, timestamp: boolean) {
  return (
    (timestamp === false
      ? date?.format(DatepickerSaveFormatNoTimestamp)
      : date?.format(DatepickerSaveFormatTimestamp)) ?? ''
  );
}

export function getDateConstraint(dateOrFlag: string | DateFlags | undefined, constraint: 'min' | 'max'): string {
  if (dateOrFlag === DateFlags.Today) {
    return moment().set('hour', 12).set('minute', 0).set('seconds', 0).set('milliseconds', 0).toISOString();
  }
  const date = getISOString(dateOrFlag);
  if (typeof date === 'string') {
    return date;
  }
  if (constraint === 'min') {
    return DatepickerMinDateDefault;
  } else {
    return DatepickerMaxDateDefault;
  }
}

export function isDate(date: string): boolean {
  return !isNaN(new Date(date).getTime());
}

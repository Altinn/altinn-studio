import moment from 'moment';

import { DateFlags } from 'src/types';

export const DatePickerMinDateDefault = '1900-01-01T12:00:00.000Z';
export const DatePickerMaxDateDefault = '2100-01-01T12:00:00.000Z';
export const DatePickerFormatDefault = 'DD.MM.YYYY';
export const DatePickerSaveFormatTimestamp = 'YYYY-MM-DDThh:mm:ss.sssZ';
export const DatePickerSaveFormatNoTimestamp = 'YYYY-MM-DD';

export function getISOString(potentialDate: string | undefined): string | undefined {
  if (!potentialDate) {
    return undefined;
  }

  const momentDate = moment(potentialDate);
  momentDate.set('hour', 12).set('minute', 0).set('second', 0).set('millisecond', 0);
  return momentDate.isValid() ? momentDate.toISOString() : undefined;
}

const locale = window.navigator?.language || (window.navigator as any)?.userLanguage || 'nb';
moment.locale(locale);

export function getDateFormat(format?: string): string {
  return moment.localeData().longDateFormat('L') || format || DatePickerFormatDefault;
}

export function getDateString(date: moment.Moment | null, timestamp: boolean) {
  return (
    (timestamp === false
      ? date?.format(DatePickerSaveFormatNoTimestamp)
      : date?.format(DatePickerSaveFormatTimestamp)) ?? ''
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
    return DatePickerMinDateDefault;
  } else {
    return DatePickerMaxDateDefault;
  }
}

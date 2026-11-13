import type { TFunction } from 'i18next';
import { formatDuration } from './formatDuration';

export const NO_USE_LIMIT_DAYS = 90;
const DAYS_PER_MONTH = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MILLISECONDS_PER_DAY);

/**
 * How many whole months an app has gone without a single new instance, counted back from the last
 * stored day, or 0 when it is in use or the stored history is too short to tell. An app whose last
 * instance predates the history counts from the first stored day, so a fresh table does not flag
 * every quiet app at once.
 */
export function noUseMonths(
  lastInstanceCreatedOn: string | null,
  observedSince: string | null,
  metricDate: string | null,
  limitDays: number = NO_USE_LIMIT_DAYS,
): number {
  if (!metricDate) {
    return 0;
  }
  const since = lastInstanceCreatedOn ?? observedSince;
  if (!since) {
    return 0;
  }
  const days = daysBetween(since, metricDate);
  return days > limitDays ? Math.floor(days / DAYS_PER_MONTH) : 0;
}

/**
 * The typical time to complete as the list shows it: the two largest units, like "11 min" or
 * "2 d 4 t". Null when nothing completed in the period.
 */
export function formatTypicalTime(seconds: number | null, t: TFunction): string | null {
  if (seconds === null) {
    return null;
  }
  return formatDuration(seconds * 1000, t);
}

/**
 * The change from the previous period in whole percent, or null when the previous period had
 * nothing to compare with.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/** The share in whole percent, or null when the denominator is zero. */
export function percentOf(part: number, whole: number): number | null {
  if (whole === 0) {
    return null;
  }
  return Math.round((part / whole) * 100);
}

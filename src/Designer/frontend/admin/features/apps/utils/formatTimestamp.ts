export type TimestampPrecision = 'seconds' | 'milliseconds';

/**
 * An engine timestamp as an operator reads it: date and time of day, to the second, or to the
 * millisecond where several things happen within the same second — steps, and the errors an
 * operator lines up against the app's log. Storage timestamps keep the coarser minute format
 * of the instance views.
 *
 * A value that does not parse is shown as it came rather than thrown, so one odd timestamp cannot
 * take a whole view down.
 */
export function formatTimestamp(
  value: string | null | undefined,
  precision: TimestampPrecision = 'seconds',
): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('no-NB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...(precision === 'milliseconds' ? { fractionalSecondDigits: 3 } : {}),
  }).format(date);
}

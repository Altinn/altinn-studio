import type { TFunction } from 'i18next';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

/**
 * A duration as an operator reads it: the two largest units that are not zero, so "1 t 5 min" and
 * "3 min 4 s" rather than a clock face. Anything under a second reads as zero seconds.
 */
export function formatDuration(milliseconds: number, t: TFunction): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const parts = [
    { key: 'admin.workflows.duration.days', count: Math.floor(totalSeconds / SECONDS_PER_DAY) },
    {
      key: 'admin.workflows.duration.hours',
      count: Math.floor((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR),
    },
    {
      key: 'admin.workflows.duration.minutes',
      count: Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    },
    { key: 'admin.workflows.duration.seconds', count: totalSeconds % SECONDS_PER_MINUTE },
  ];
  const largest = parts.findIndex((part) => part.count > 0);
  if (largest < 0) {
    return t('admin.workflows.duration.seconds', { count: 0 });
  }
  return parts
    .slice(largest, largest + 2)
    .filter((part) => part.count > 0)
    .map((part) => t(part.key, { count: part.count }))
    .join(' ');
}

import { DateUtils } from '@studio/pure-functions';

export const formatDateAndTime = (timestamp: number, locale: string = 'en-US') => {
  const date = new Date(timestamp);
  const isoString = date.toISOString();
  const datePart = DateUtils.formatDateDDMMYYYY(isoString);

  const timePart = date
    .toLocaleTimeString(locale, {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })
    .replace(/:/g, '.');

  return `${datePart}, ${timePart}`;
};

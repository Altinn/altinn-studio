import { DateUtils } from '@studio/pure-functions';

export const formatDateAndTime = (timestamp: number, locale: string = 'nb-NO') => {
  const date = new Date(timestamp);
  const isoString = date.toISOString();
  const datePart = DateUtils.formatDateDDMMYYYY(isoString);

  const timePart = date.toLocaleTimeString(locale, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${datePart}, ${timePart}`;
};

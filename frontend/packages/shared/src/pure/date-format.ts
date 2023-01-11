export const formatTimeHHmm = (dateasstring: string, timeZone?: string) =>
  new Date(dateasstring).toLocaleTimeString('no-NB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });

export const formatDateDDMMYY = (dateasstring: string, timeZone?: string) =>
  new Date(dateasstring).toLocaleDateString('no-NB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  });

export const formatDateTime = (dateasstring: string, timeZone?: string) =>
  [formatDateDDMMYY(dateasstring, timeZone), formatTimeHHmm(dateasstring, timeZone)].join(' ');

/**
 * Adds minutes to a date and returns a new Date object
 *
 * @param datestring
 * @param minutes
 */
export const addMinutesToTime = (datestring: string, minutes: number) =>
  new Date(new Date(datestring).getTime() + minutes * 60000);

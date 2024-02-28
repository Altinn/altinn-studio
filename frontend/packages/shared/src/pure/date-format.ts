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

export const isDateWithinSeconds = (date: string, seconds: number) => {
  const currentDate = new Date();
  const startedDate = new Date(date);
  const diff = (currentDate.getTime() - startedDate.getTime()) / 1000;
  return diff <= seconds;
};

export const isDateWithinDays = (date: string, days: number) => {
  return isDateWithinSeconds(date, days * 60 * 60 * 24);
};

/**
 * Adds minutes to a date and returns a new Date object
 *
 * @param datestring
 * @param minutes
 */
export const addMinutesToTime = (datestring: string, minutes: number) =>
  new Date(new Date(datestring).getTime() + minutes * 60000);

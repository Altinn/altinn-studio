export const isDateValid = (dateStr: string): boolean => {
  return !isNaN(Date.parse(dateStr));
};

/**
 * Formats a datestring of the format YYYY-MM-DDTHH:MM:SSZ to the
 * following date and time format: DD.MM.YYYY HH:MM, where the time
 * is the time in the current timezone.
 *
 * @param dateString the date string to format
 *
 * @returns the formated date and time string
 */
export const formatDateToDateAndTimeString = (dateString: string): string => {
  if (!isDateValid(dateString)) return '';
  return new Intl.DateTimeFormat('no-NB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(new Date(dateString));
};

/**
 * Checks if the provided string is a valid date in the format YYYY-MM-DD.
 *
 * @param {string} date - The date string to validate.
 *
 * @returns {boolean} - True if the date is valid, false otherwise.
 */
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
};

/**
 * Checks if the provided string is a valid time in the format HH:mm.
 *
 * @param {string} time - The time string to validate.
 *
 * @returns {boolean} - True if the time is valid, false otherwise.
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  return timeRegex.test(time);
};

/**
 * Checks if the first date is after the second date.
 *
 * @param {string} dateString1 - The first date string.
 * @param {string} dateString2 - The second date string.
 *
 * @returns {boolean} - True if the first date is after the second date, false otherwise.
 */
export const isDateAfter = (dateString1: string, dateString2: string): boolean => {
  const date1 = new Date(dateString1);
  const date2 = new Date(dateString2);

  return date1 > date2;
};

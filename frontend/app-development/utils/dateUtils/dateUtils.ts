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
  const date = new Date(dateString);

  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

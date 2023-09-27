/**
 * Formats a datestring of the format YYYY-MM-DDTHH:MM:SSZ to the
 * following date and time format: DD.MM.YYYY HH:MM, where the time
 * is the time in the current timezone.
 *
 * @param dateString the date string to format
 *
 * @returns the formated date and time string
 */
/*export const formatDateToDateAndTimeString = (dateString: string): string => {
  const date = new Date(dateString);

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat(undefined, formatOptions);
  const formattedDate = formatter.format(date);

  console.log(formattedDate);
  return formattedDate;
};*/
export const formatDateToDateAndTimeString = (dateString: string): string => {
  return new Intl.DateTimeFormat('no-NB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(new Date(dateString));
};

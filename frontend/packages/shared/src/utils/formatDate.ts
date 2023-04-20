import { formatDateTime } from 'app-shared/pure/date-format';

/**
 * @deprecated
 */
export function formatNameAndDate(name: string, date: string) {
  const returnDate = date ? formatDateTime(date) : date;
  return name ? `${name} ${returnDate}` : returnDate;
}

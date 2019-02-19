import * as moment from 'moment';

export function formatNameAndDate(name: string, date: string) {
  const returnDate = date ? moment.utc(new Date(date)).format('DD.MM.YYYY HH:mm') : date;
  return name ? `${name} ${returnDate}` : returnDate;
}

import moment from 'moment';

export function formatISOString(isoString: string, format: string): string | null {
  const date = moment(isoString, moment.ISO_8601);
  return date.isValid() ? date.format(format) : null;
}

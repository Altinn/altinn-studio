import moment from 'moment';
import { DateFlags } from 'src/types';

/*
  Creates a specific date based on different flags (DatepickerRestrictionFlags)
  Returns moment.Moment or null
*/
export function getFlagBasedDate(flag: DateFlags): string | undefined {
  if (flag === DateFlags.Today) {
    return moment()
      .set('hour', 12)
      .set('minute', 0)
      .toISOString();
  }

  return undefined;
}

export function getISOString(potentialDate: string): string | undefined {
  if (!potentialDate) {
    return undefined;
  }

  const momentDate = moment(potentialDate);
  return momentDate.isValid() ? momentDate.toISOString() : undefined;
}

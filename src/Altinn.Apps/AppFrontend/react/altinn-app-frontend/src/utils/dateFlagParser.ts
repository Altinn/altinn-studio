import moment from 'moment';
import { DatepickerRestrictionFlags as DateFlags } from 'src/types';

/*
  Creates a specific date based on different flags (DatepickerRestrictionFlags)
  Returns moment.Moment or null
*/
export function getFlagBasedDate(flagOrDate: string): moment.Moment {
  if (!flagOrDate) {
    return null;
  }

  if (flagOrDate === DateFlags.Today) {
    const today = moment();
    today.set('hour', 12);
    today.set('minute', 0);
    return today;
  }

  return moment(flagOrDate);
}

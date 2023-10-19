import { isDateAfter } from 'app-development/utils/dateUtils';

/**
 * Returns if two dates are valid or not, to be used to display the error
 * message in the SetupTab.
 *
 * @param from the date string from
 * @param to the date string to
 *
 * @returns true if it is valid,false if it is not valid.
 */
export const getIsDatesValid = (from: string, to: string): boolean => {
  if (from === undefined || to === undefined) return true;
  return isDateAfter(to, from);
};

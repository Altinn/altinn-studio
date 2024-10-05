/**
 * Replaces any character not in the list below with '-'
 *
 * @param s the string to format
 * @returns the string formatted
 */
export const formatIdString = (s: string): string => {
  return s.replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase();
};

export const isAppPrefix = (s: string): boolean => {
  return s.substring(0, 4) === 'app_';
};

export const isSePrefix = (s: string): boolean => {
  return s.substring(0, 3) === 'se_';
};

/**
 * Numbers with a specific meaning (postal numbers, phone numbers etc) should not be
 * read by screen readers as millons-thousands etc, but rather as groups of numbers.
 *
 * @param s the string to format
 * @returns the string formatted
 */
export const stringNumberToAriaLabel = (s: string): string => {
  return s.split('').join(' ');
};

export const isOrgNrString = (s: string): boolean => {
  return /^\d{9}$/.test(s); // regex for search string is exactly 9 digits
};

export const getAppName = (org: string): string => {
  return `${org}-resources`;
};

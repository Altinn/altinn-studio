import { last } from 'app-shared/utils/arrayUtils';

/**
 * Returns substring after last occurrence of separator.
 * @param str The string to search in.
 * @param separator The separator to search for.
 * @returns The substring after the last occurrence of the given separator.
 */
export const substringAfterLast = (str: string, separator: string): string =>
  last(str.split(separator)) || '';

/**
 * Returns substring before last occurrence of separator.
 * @param str The string to search in.
 * @param separator The separator to search for.
 * @returns The substring before the last occurrence of the given separator.
 */
export const substringBeforeLast = (str: string, separator: string): string =>
  str.includes(separator) ? str.substring(0, str.lastIndexOf(separator)) : str;

/**
 * Replaces the given substring with the given replacement at the start of the string.
 * If the substring does not appear at the start of the string, the string is returned unchanged.
 * @param str The string to search in.
 * @param substring The substring to search for.
 * @param replacement The replacement to replace the substring with.
 * @returns The string with the substring replaced at the start.
 */
export const replaceStart = (str: string, substring: string, replacement: string): string =>
  str.replace(new RegExp('^' + substring), replacement);

/**
 * Replaces the given substring with the given replacement at the end of the string.
 * If the substring does not appear at the end of the string, the string is returned unchanged.
 * @param str The string to search in.
 * @param substring The substring to search for.
 * @param replacement The replacement to replace the substring with.
 * @returns The string with the substring replaced at the end.
 */
export const replaceEnd = (str: string, substring: string, replacement: string): string =>
  str.replace(new RegExp(substring + '$'), replacement);

/**
 * Removes any of the given substrings from the start of the string.
 * @param str The string to search in.
 * @param substrings The substrings to search for.
 * @returns The string with the substrings removed from the start.
 */
export const removeStart = (str: string, ...substrings: string[]): string => {
  const lowerCaseStr = str.toLowerCase();
  for (const substring of substrings) {
    if (lowerCaseStr.startsWith(substring.toLowerCase())) {
      return str.slice(substring.length);
    }
  }
  return str;
};

/**
 * Removes any of the given substrings from the end of the string.
 * If none of the substrings appear at the end of the string, the string is returned unchanged.
 * Not case sensitive.
 * @param str The string to search in.
 * @param substrings The substrings to search for.
 * @returns The string with the substrings removed from the end.
 */
export const removeEnd = (str: string, ...substrings: string[]): string => {
  const lowerCaseStr = str.toLowerCase();
  for (const substring of substrings) {
    if (lowerCaseStr.endsWith(substring.toLowerCase())) {
      return str.slice(0, -substring.length);
    }
  }
  return str;
};

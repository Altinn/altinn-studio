import { last } from 'app-shared/utils/arrayUtils';

/**
 * Returns substring after last occurrence of separator.
 * @param str The string to search in.
 * @param separator The separator to search for.
 * @returns The substring after the last occurrence of the given separator.
 */
export const substringAfterLast = (str: string, separator: string): string => last(str.split(separator)) || '';

/**
 * Returns substring before last occurrence of separator.
 * @param str The string to search in.
 * @param separator The separator to search for.
 * @returns The substring before the last occurrence of the given separator.
 */
export const substringBeforeLast = (str: string, separator: string): string =>
  str.includes(separator) ? str.substring(0, str.lastIndexOf(separator)) : str;

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


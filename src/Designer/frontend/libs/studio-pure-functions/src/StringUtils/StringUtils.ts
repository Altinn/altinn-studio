import { ArrayUtils } from '../ArrayUtils';

export class StringUtils {
  /**
   * Removes any of the given substrings from the start of the string.
   * @param str The string to search in.
   * @param substrings The substrings to search for.
   * @returns The string with the substrings removed from the start.
   */
  static removeStart = (str: string, ...substrings: string[]): string => {
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
   * Not case-sensitive.
   * @param str The string to search in.
   * @param substrings The substrings to search for.
   * @returns The string with the substrings removed from the end.
   */
  static removeEnd = (str: string, ...substrings: string[]): string => {
    const lowerCaseStr = str.toLowerCase();
    for (const substring of substrings) {
      if (lowerCaseStr.endsWith(substring.toLowerCase())) {
        return str.slice(0, -substring.length);
      }
    }
    return str;
  };

  /**
   * Replaces the given substring with the given replacement at the end of the string.
   * If the substring does not appear at the end of the string, the string is returned unchanged.
   * @param str The string to search in.
   * @param substring The substring to search for.
   * @param replacement The replacement to replace the substring with.
   * @returns The string with the substring replaced at the end.
   */
  static replaceEnd = (str: string, substring: string, replacement: string): string =>
    str.replace(new RegExp(substring + '$'), replacement);

  /**
   * Replaces the given substring with the given replacement at the start of the string.
   * If the substring does not appear at the start of the string, the string is returned unchanged.
   * @param str The string to search in.
   * @param substring The substring to search for.
   * @param replacement The replacement to replace the substring with.
   * @returns The string with the substring replaced at the start.
   */
  static replaceStart = (str: string, substring: string, replacement: string): string => {
    if (str.startsWith(substring)) {
      return replacement + str.slice(substring.length);
    }
    return str;
  };

  /**
   * Returns substring before last occurrence of separator.
   * @param str The string to search in.
   * @param separator The separator to search for.
   * @returns The substring before the last occurrence of the given separator.
   */
  static substringBeforeLast = (str: string, separator: string): string =>
    str.includes(separator) ? str.substring(0, str.lastIndexOf(separator)) : str;

  /**
   * Returns substring after last occurrence of separator.
   * @param str The string to search in.
   * @param separator The separator to search for.
   * @returns The substring after the last occurrence of the given separator.
   */
  static substringAfterLast = (str: string, separator: string): string =>
    ArrayUtils.last(str.split(separator)) || '';

  static capitalize = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  static areCaseInsensitiveEqual = (string: string, stringToCompare: string): boolean =>
    string.localeCompare(stringToCompare, 'nb', { sensitivity: 'base' }) === 0;

  static removeLeadingSlash = (str: string): string => str.replace(/^\//g, '');
}

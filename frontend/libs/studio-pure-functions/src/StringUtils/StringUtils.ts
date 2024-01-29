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
   * Not case sensitive.
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
}

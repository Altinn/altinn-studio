/**
 * Replaces white space with hyphens in a string
 *
 * @param value the string to modify
 *
 * @returns the modified string where white space has been replaced with '-'
 */
export const replaceWhiteSpaceWithHyphens = (value: string): string => value.replace(/\s/g, '-');

/**
 * Replaces any character not in the list below with '-'
 *
 * @param s the string to format
 * @returns the string formatted
 */
export const formatIdString = (s: string): string => {
  return s.replace(/[^A-Za-z0-9_æøåØÆÅ-]+/g, '-').toLowerCase();
};

export const isAppPrefix = (s: string): boolean => {
  return s.substring(0, 4) === 'app_';
};

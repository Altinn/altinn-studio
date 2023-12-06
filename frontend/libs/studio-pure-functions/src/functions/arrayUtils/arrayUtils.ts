/**
 * Removes duplicates from an array.
 * @param array The array of interest.
 * @returns The array without duplicates.
 */
export const studioRemoveDuplicates = <T>(array: T[]): T[] => [...new Set(array)];

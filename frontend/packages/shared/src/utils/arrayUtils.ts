export const removeDuplicates = <T>(array: T[]): T[] => [...new Set(array)];

export const prepend = <T>(array: T[], item: T): T[] => [item, ...array];

export const last = <T>(array: T[]): T => array[array.length - 1];

export const replaceLastItem = <T>(array: T[], replaceWith: T): T[] => {
  array[array.length - 1] = replaceWith;
  return array;
};

/**
 * Removes item from array by value.
 * @param array Array to delete item from.
 * @param value Value to delete.
 * @returns Array without the given value.
 */
export const removeItemByValue = <T>(array: T[], value: T): T[] =>
  array.filter((item) => item !== value);

/**
 * Checks if all items in the given array are unique.
 * @param array The array of interest.
 * @returns True if all items in the array are unique and false otherwise.
 */
export const areItemsUnique = <T>(array: T[]): boolean => array.length === new Set(array).size;

/**
 * Removes duplicates from an array.
 * @param array The array of interest.
 * @returns The array without duplicates.
 */
export const removeDuplicates = <T>(array: T[]): T[] => [...new Set(array)];

/**
 * Adds an item to the beginning of an array..
 * @param array The array of interest.
 * @param item The item to prepend.
 * @returns The array with the item prepended.
 */
export const prepend = <T>(array: T[], item: T): T[] => [item, ...array];

/**
 * Returns the last item in an array.
 * @param array The array of interest.
 * @returns The last item in the given array.
 */
export const last = <T>(array: T[]): T => array[array.length - 1];

/**
 * Replaces the last item in an array.
 * @param array The array of interest.
 * @param replaceWith The item to replace the last item with.
 * @returns The array with the last item replaced.
 */
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

/**
 * Swaps the first values with the given values.
 * @param array Array to swap items in.
 * @param itemA First value to swap.
 * @param itemB Second value to swap.
 * @returns Array with swapped items.
 */
export const swapArrayElements = <T>(array: T[], itemA: T, itemB: T): T[] => {
  const out = [...array];
  const indexA = array.indexOf(itemA);
  const indexB = array.indexOf(itemB);
  out[indexA] = itemB;
  out[indexB] = itemA;
  return out;
};

/**
 * Inserts an item at a given position in an array.
 * @param array Array to remove item from.
 * @param item Item to remove.
 * @param targetPos Position to remove item from.
 * @returns Array with item inserted at given position.
 */
export const insertArrayElementAtPos = <T>(array: T[], item: T, targetPos: number): T[] => {
  const out = [...array];
  if (targetPos >= array.length || targetPos < 0) out.push(item);
  else out.splice(targetPos, 0, item);
  return out;
};

/**
 * Returns an array of which the elements are present in both given arrays.
 * @param arrA First array.
 * @param arrB Second array.
 * @returns Array of which the elements are present in both given arrays.
 */
export const arrayIntersection = <T>(arrA: T[], arrB: T[]) => arrA.filter((x) => arrB.includes(x));

/**
 * Maps an array of objects by a given key.
 * @param array The array of objects.
 * @param key The key to map by.
 * @returns An array of values mapped by the given key.
 */
export const mapByKey = <T extends object, K extends keyof T>(array: T[], key: K): T[K][] =>
  array.map((item) => item[key]);

/**
 * Returns an array of which the items matching the given value are replaced with the given item.
 * @param array The array of interest.
 * @param value The value to match items by.
 * @param replaceWith The item to replace the matching items with.
 */
export const replaceItemsByValue = <T>(array: T[], value: T, replaceWith: T): T[] =>
  replaceByPredicate(array, (item) => item === value, replaceWith);

/**
 * Returns an array of which the items matching the given predicate are replaced with the given item.
 * @param array The array of interest.
 * @param predicate The predicate to match items by.
 * @param replaceWith The item to replace the matching items with.
 * @returns A shallow copy of the array with the matching items replaced.
 */
export const replaceByPredicate = <T>(
  array: T[],
  predicate: (item: T) => boolean,
  replaceWith: T,
): T[] => {
  const out = [...array];
  const index = array.findIndex(predicate);
  if (index > -1) out[index] = replaceWith;
  return out;
};

/**
 * Returns an array where the item at the given index is moved to the given index.
 * @param array The array of interest.
 * @param from The index of the item to move.
 * @param to The index to move the item to.
 */
export const moveArrayItem = <T>(array: T[], from: number, to: number): T[] => {
  const out = [...array];
  const item = out.splice(from, 1)[0];
  out.splice(to, 0, item);
  return out;
};

/** Returns a string that is not already present in the given array by appending a number to the given prefix. */
export const generateUniqueStringWithNumber = (array: string[], prefix: string = ''): string => {
  let i = 0;
  let uniqueString = prefix + i;
  while (array.includes(uniqueString)) {
    i++;
    uniqueString = prefix + i;
  }
  return uniqueString;
};

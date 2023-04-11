export const removeDuplicates = <T>(array: T[]): T[] => [...new Set(array)];

export const prepend = <T>(array: T[], item: T): T[] => [item, ...array];

export const last = <T>(array: T[]): T => array[array.length - 1];

export const replaceLastItem = <T>(array: T[], replaceWith: T): T[] => {
  array[array.length - 1] = replaceWith;
  return array;
};

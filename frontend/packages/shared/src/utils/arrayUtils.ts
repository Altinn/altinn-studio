export const removeDuplicates = <T>(array: T[]): T[] => [...new Set(array)];

export const prepend = <T>(array: T[], item: T): T[] => [item, ...array];

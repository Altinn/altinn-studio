export const consistsOfStringsOnly = (array: unknown[]): array is string[] =>
  array.every((value) => typeof value === 'string');

export const areStringsUnique = (strings: string[]): boolean => strings.length === new Set(strings).size;

export const zipArrays = <V1, V2>(array1: V1[], array2: V2[]): Array<[V1, V2]> =>
  array1.map((value, index) => [value, array2[index]]);

import { ArrayUtils } from '@studio/pure-functions';

export const findDuplicateValues = (array: string[]): string[] | null => {
  const arrayWithoutEmptyStrings: string[] = ArrayUtils.removeEmptyStrings(array);

  if (ArrayUtils.areItemsUnique(arrayWithoutEmptyStrings)) return null;

  return findDuplicates(arrayWithoutEmptyStrings);
};

type CountMap = { [key: string]: number };

const findDuplicates = (array: string[]): string[] => {
  const countMap: CountMap = createCountMap(array);
  return findGreaterThanOneEntries(countMap);
};

const createCountMap = (array: string[]): CountMap => {
  const countMap: CountMap = {};
  array.forEach((element) => {
    countMap[element] = (countMap[element] || 0) + 1;
  });
  return countMap;
};

const findGreaterThanOneEntries = (countMap: CountMap) => {
  const duplicates: string[] = [];
  for (const key in countMap) {
    if (countMap[key] > 1) {
      duplicates.push(key);
    }
  }
  return duplicates;
};

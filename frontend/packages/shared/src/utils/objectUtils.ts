import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { areItemsUnique } from 'app-shared/utils/arrayUtils';

/**
 * Checks if two objects are equal (shallow comparison).
 * @param obj1 The first object.
 * @param obj2 The second object.
 * @returns True if the objects are equal and false otherwise.
 */
export const areObjectsEqual = <T extends object>(obj1: T, obj2: T): boolean => {
  if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;
  for (const key in obj1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  return true;
};

/**
 * Maps an array of objects to a key-value pair object, where the key is the value of the given property.
 * Requires that the values of the given property are unique.
 * @param objectList
 * @param property
 */
export const mapByProperty = <T extends object>(
  objectList: T[],
  property: keyof T,
): KeyValuePairs<T> => {
  const keys = objectList.map((object) => object[property]);
  if (!areItemsUnique(keys)) {
    throw new Error(
      'The values of the given property in the mapByProperty function should be unique.',
    );
  }
  return Object.fromEntries(objectList.map((object) => [object[property], object]));
};

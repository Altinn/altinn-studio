import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

/**
 * Maps an array of objects to a key-value pair object, where the key is the value of the property.
 * Requires that the property value is unique for each object.
 * @param objectList
 * @param property
 */
export const mapByProperty = <T extends object>(
  objectList: T[],
  property: keyof T,
): KeyValuePairs<T> => Object.fromEntries(objectList.map((object) => [object[property], object]));

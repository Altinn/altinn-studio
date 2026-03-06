import { type KeyValuePairs } from '../types/KeyValuePairs';

export class ObjectUtils {
  static deepCopy = <T>(value: T) => JSON.parse(JSON.stringify(value)) as T;

  /**
   * Checks if two objects are equal (shallow comparison).
   * @param obj1 The first object.
   * @param obj2 The second object.
   * @returns True if the objects are equal and false otherwise.
   */
  static areObjectsEqual = <T extends object>(
    obj1: T | null | undefined,
    obj2: T | null | undefined,
  ): boolean => {
    if (obj1 === obj2) return true;
    if (obj1 === null || obj2 === null) return false;
    if (obj1 === undefined || obj2 === undefined) return false;
    const keys = Object.getOwnPropertyNames(obj1);
    if (keys.length !== Object.getOwnPropertyNames(obj2).length) return false;
    return keys.every((key) => {
      const value1 = obj1[key];
      const value2 = obj2[key];
      if (typeof value1 === 'object' && typeof value2 === 'object') {
        return ObjectUtils.areObjectsEqual(value1, value2);
      }
      return value1 === value2;
    });
  };

  /**
   * Maps an array of objects to a key-value pair object, where the key is the value of the given property.
   * @param objectList
   * @param property
   * @returns An object with the values of the given property as keys and the objects as values.
   */
  static mapByProperty = <T extends object>(
    objectList: T[],
    property: keyof T,
  ): KeyValuePairs<T> => {
    return Object.fromEntries(objectList.map((object) => [object[property], object]));
  };

  /**
   * Flattens the values of an object.
   * @param object The object to flatten.
   * @returns An array of the values of the object.
   */
  static flattenObjectValues = <T extends object>(object: T): string[] => {
    return Object.entries(object)
      .map(([, value]) => {
        return value;
      })
      .flat();
  };

  static deleteUndefined = <T>(obj: { [s: string]: T }): { [s: string]: T } =>
    Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

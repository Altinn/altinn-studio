export class ObjectUtils {
  static deepCopy = <T>(value: T) => JSON.parse(JSON.stringify(value)) as T;

  /**
   * Checks if two objects are equal (shallow comparison).
   * @param obj1 The first object.
   * @param obj2 The second object.
   * @returns True if the objects are equal and false otherwise.
   */
  static areObjectsEqual = <T extends object>(obj1: T, obj2: T): boolean => {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;
    for (const key in obj1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    return true;
  };
}

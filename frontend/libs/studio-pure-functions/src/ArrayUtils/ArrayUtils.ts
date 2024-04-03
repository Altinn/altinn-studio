export class ArrayUtils {
  /**
   * Removes duplicates from an array
   * @param array The array of interest
   * @returns The array without duplicates
   */
  public static removeDuplicates<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Returns a valid index of the given array
   * @param array The array of interest
   * @param givenIndex The index to check
   * @returns The givenIndex if it is valid, the last index of the array otherwise
   */
  public static getValidIndex<T>(array: T[], givenIndex: number): number {
    return givenIndex < 0 || givenIndex >= array.length ? array.length - 1 : givenIndex;
  }

  /** Returns the last item of the given array */
  public static last = <T>(array: T[]): T => array[array.length - 1];

  /** Replaces an element in an array with a new value */
  public static replaceByIndex = <T>(array: T[], index: number, newValue: T): T[] => {
    if (index < 0 || index >= array.length) return array;
    const newArray = [...array];
    newArray[index] = newValue;
    return newArray;
  };

  /** Removes the item with the given index from the given array. */
  public static removeItemByIndex = <T>(array: T[], indexToRemove: number): T[] =>
    array.filter((_, index) => index !== indexToRemove);

  /** Returns the provided array if it has at least one item, otherwise returns undefined */
  public static getNonEmptyArrayOrUndefined = <T>(array: T[]): T[] | undefined =>
    array.length > 0 ? array : undefined;
}

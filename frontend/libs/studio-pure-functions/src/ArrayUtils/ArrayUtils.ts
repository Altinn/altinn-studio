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

  /**
   * Removes item from array by value.
   * @param array Array to delete item from.
   * @param value Value to delete.
   * @returns Array without the given value.
   */
  public static removeItemByValue<T>(array: T[], value: T): T[] {
    return array.filter((item) => item !== value);
  }

  /** Returns the last item of the given array */
  public static last = <T>(array: T[]): T => array[array.length - 1];

  public static hasIntersection = <T>(arrA: T[], arrB: T[]): boolean => {
    return arrA.some((x) => arrB.includes(x));
  };

  /**
   * Returns an array of which the element of arrA are either present or not present in arrB based on the include param.
   * @param arrA The first array.
   * @param arrB The second array.
   * @param include Whether to include or exclude the elements of arrB from arrA. Defaults to true.
   * @returns Array that contains the filtered elements based on the filtering condition.
   */
  public static intersection = <T>(arrA: T[], arrB: T[], include: boolean = true): T[] => {
    return arrA.filter((x) => (include ? arrB.includes(x) : !arrB.includes(x)));
  };

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

  /**
   * Adds an item to the beginning of an array..
   * @param array The array of interest.
   * @param item The item to prepend.
   * @returns The array with the item prepended.
   */
  public static prepend<T>(array: T[], item: T): T[] {
    return [item, ...array];
  }
}

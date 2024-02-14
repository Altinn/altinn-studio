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
}

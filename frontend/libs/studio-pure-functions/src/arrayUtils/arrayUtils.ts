export class ArrayUtils {
  /**
   * Removes duplicates from an array.
   * @param array The array of interest.
   * @returns The array without duplicates.
   */
  public static removeDuplicates<T>(array: T[]): T[] {
    return [...new Set(array)];
  }
}

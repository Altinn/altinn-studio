export class ArrayUtils {
  /**
   * Returns a reversed copy of the array without mutating the original.
   * Returns undefined if the input is undefined.
   */
  public static safeReverse<T>(array: T[] | undefined): T[] | undefined {
    return array ? [...array].reverse() : undefined;
  }

  /**
   * Returns a new array with the element at the given index removed.
   * Does not mutate the original array.
   */
  public static removeAtIndex<T>(array: T[], index: number): T[] {
    return [...array.slice(0, index), ...array.slice(index + 1)];
  }
}

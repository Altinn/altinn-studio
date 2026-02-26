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

  public static removeLast<T>(array: Array<T>): Array<T> {
    return array.slice(0, -1);
  }

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

  public static isDuplicate<T>(value: T, valueList: T[]): boolean {
    return valueList.filter((item) => item === value).length > 1;
  }

  /**
   * Returns a string representation of the given array.
   * @param array The array of interest.
   * @param delimiter The delimiter to use between items. Defaults to ', '.
   * @returns A string representation of the given array.
   */
  public static toString = <T>(array: T[], delimiter: string = ','): string =>
    array.join(delimiter);

  /**
   * Splits a delimited string into an array.
   * @param array The array of interest.
   * @param delimiter The delimiter to split the string by. Defaults to ','.
   * @returns An array of strings.
   */
  public static getArrayFromString = (string: string, delimiter: string = ','): string[] => {
    if (!string) return [];
    return string.split(delimiter).map((item) => item.trim());
  };

  /**
   * Replaces the last item in an array.
   * @param array The array of interest.
   * @param replaceWith The item to replace the last item with.
   * @returns The array with the last item replaced.
   */
  static replaceLastItem = <T>(array: T[], replaceWith: T): T[] => {
    if (array.length === 0) {
      return array;
    }
    array[array.length - 1] = replaceWith;
    return array;
  };

  /**
   * Checks if all items in the given array are unique.
   * @param array The array of interest.
   * @returns True if all items in the array are unique and false otherwise.
   */
  static areItemsUnique = <T>(array: T[]): boolean => array.length === new Set(array).size;

  /**
   * Swaps the first values with the given values.
   * @param array Array to swap items in.
   * @param itemA First value to swap.
   * @param itemB Second value to swap.
   * @returns Array with swapped items.
   */
  static swapArrayElements = <T>(array: T[], itemA: T, itemB: T): T[] => {
    const out = [...array];
    const indexA = array.indexOf(itemA);
    const indexB = array.indexOf(itemB);
    out[indexA] = itemB;
    out[indexB] = itemA;
    return out;
  };

  /**
   * Inserts an item at a given position in an array.
   * @param array Array to remove item from.
   * @param item Item to remove.
   * @param targetPos Position to remove item from.
   * @returns Array with item inserted at given position.
   */
  static insertArrayElementAtPos = <T>(array: T[], item: T, targetPos: number): T[] => {
    const out = [...array];
    if (targetPos >= array.length || targetPos < 0) out.push(item);
    else out.splice(targetPos, 0, item);
    return out;
  };

  /**
   * Maps an array of objects by a given key.
   * @param array The array of objects.
   * @param key The key to map by.
   * @returns An array of values mapped by the given key.
   */
  static mapByKey = <T extends object, K extends keyof T>(array: T[], key: K): T[K][] =>
    array.map((item) => item[key]);

  /**
   * Returns an array of which the items matching the given predicate are replaced with the given item.
   * @param array The array of interest.
   * @param predicate The predicate to match items by.
   * @param replaceWith The item to replace the matching items with.
   * @returns A shallow copy of the array with the matching items replaced.
   */
  static replaceByPredicate = <T>(
    array: T[],
    predicate: (item: T) => boolean,
    replaceWith: T,
  ): T[] => {
    const out = [...array];
    const index = array.findIndex(predicate);
    if (index > -1) out[index] = replaceWith;
    return out;
  };

  /**
   * Returns an array of which the items matching the given value are replaced with the given item.
   * @param array The array of interest.
   * @param value The value to match items by.
   * @param replaceWith The item to replace the matching items with.
   */
  static replaceItemsByValue = <T>(array: T[], value: T, replaceWith: T): T[] =>
    ArrayUtils.replaceByPredicate(array, (item) => item === value, replaceWith);

  /**
   * Returns an array where the item at the given index is moved to the given index.
   * @param array The array of interest.
   * @param from The index of the item to move.
   * @param to The index to move the item to.
   */
  static moveArrayItem = <T>(array: T[], from: number, to: number): T[] => {
    const out = [...array];
    const item = out.splice(from, 1)[0];
    out.splice(to, 0, item);
    return out;
  };

  /** Returns a string that is not already present in the given array by appending a number to the given prefix. */
  static generateUniqueStringWithNumber = (array: string[], prefix: string = ''): string => {
    let i = 0;
    let uniqueString = prefix + i;
    while (array.includes(uniqueString)) {
      i++;
      uniqueString = prefix + i;
    }
    return uniqueString;
  };

  /** Removes empty strings from a string array */
  static removeEmptyStrings = (array: string[]): string[] =>
    ArrayUtils.removeItemByValue(array, '');

  /** Returns array with one occurence of every type from the input array **/
  static extractUniqueTypes = (array: unknown[]): string[] => {
    const typesInArray: string[] = array.map((element) => typeof element);
    return ArrayUtils.removeDuplicates(typesInArray);
  };

  /** Checks if all elements are of the same type **/
  static hasSingleType = (array: unknown[]): boolean => {
    return ArrayUtils.extractUniqueTypes(array).length === 1;
  };

  public static extractKeyValuePairs<
    O extends Record<string | number | symbol, any>,
    K extends keyof O,
    V extends keyof O,
  >(array: O[], keyProperty: K, valueProperty: V): Record<O[K], O[V]> {
    return array.reduce(
      (acc: Record<O[K], O[V]>, item: O) => {
        const key = item[keyProperty];
        acc[key] = item[valueProperty];
        return acc;
      },
      {} as Record<O[K], O[V]>,
    );
  }

  /** Checks if the values in two arrays are the same, ignoring the sequence of the values in the arrays */
  public static arraysEqualUnordered<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    return sortedA.every((value, index) => value === sortedB[index]);
  }

  public static isArrayOfStrings(arg: unknown): arg is string[] {
    return Array.isArray(arg) && arg.every((item) => typeof item === 'string');
  }
}

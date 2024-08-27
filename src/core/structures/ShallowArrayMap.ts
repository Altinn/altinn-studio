/**
 * A shallow array map is a map with key-lookups close to O(1) time complexity. The keys here are expected to be
 * arrays containing any data type and of any length, and the items inside the array will be shallow-compared by
 * reference.
 *
 * Given an array [1, 2, 3], we can, with minimal time complexity, find the value associated with that array key.
 * Even if the array contains object like [null, new Date(), { a: 1 }], the time complexity will still be close
 * to O(1). However, as items are compared by reference, a `new Date()` object will not be equal to
 * another `new Date()`.
 *
 * To achieve this, we construct a recursive map of maps, where the first level is a simple array where the index
 * points to the map containing N number of items.
 *
 * The data structure inside here is approximately:
 * [0] -> Value // The value with zero-length array key (if any)
 * [1] -> Map -> Value // Map of values with one-length array key
 * [2] -> Map -> Map -> Value // Map of values with two-length array key
 * ... and so on
 */
export class ShallowArrayMap<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private data: Map<any, any>[] = [];

  public has(key: unknown[]): boolean {
    const keyLength = key.length;
    if (this.data[keyLength] === undefined) {
      return false;
    }

    let map = this.data[keyLength];
    for (let i = 0; i < keyLength - 1; i++) {
      map = map.get(key[i]);
      if (!map) {
        return false;
      }
    }

    return map.has(key[keyLength - 1]);
  }

  public get(key: unknown[]): T | undefined {
    const keyLength = key.length;
    if (this.data[keyLength] === undefined) {
      return undefined;
    }

    let map = this.data[keyLength];
    for (let i = 0; i < keyLength - 1; i++) {
      map = map.get(key[i]);
      if (!map) {
        return undefined;
      }
    }

    return map.get(key[keyLength - 1]);
  }

  public set(key: unknown[], value: T): void {
    const keyLength = key.length;
    if (this.data[keyLength] === undefined) {
      this.data[keyLength] = this.newMap();
    }

    let map = this.data[keyLength];
    for (let i = 0; i < keyLength - 1; i++) {
      if (!map.has(key[i])) {
        map.set(key[i], this.newMap());
      }
      map = map.get(key[i]);
    }

    map.set(key[keyLength - 1], value);
  }

  public delete(key: unknown[]): void {
    const keyLength = key.length;
    if (this.data[keyLength] === undefined) {
      return;
    }

    let map = this.data[keyLength];
    for (let i = 0; i < keyLength - 1; i++) {
      map = map.get(key[i]);
      if (!map) {
        return;
      }
    }

    map.delete(key[keyLength - 1]);
  }

  public values(): T[] {
    return this.entries().map(([, value]) => value);
  }

  public entries(): [unknown[], T][] {
    const out: [unknown[], T][] = [];
    for (const map of this.data) {
      if (!map) {
        continue;
      }

      this.recurseMap(map, (key, value: T) => {
        out.push([key, value]);
      });
    }

    return out;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private newMap(): Map<any, any> {
    const map = new Map();

    // Stamp our map with a unique symbol to prevent it from being mistaken for a value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any).__shallowArrayMap = true;

    return map;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isShallowArrayMap(map: unknown): map is Map<any, any> {
    return !!map && map instanceof Map && '__shallowArrayMap' in map && map.__shallowArrayMap === true;
  }

  private recurseMap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map: Map<any, any>,
    callback: (key: unknown[], value: unknown) => void,
    parentKey: unknown[] = [],
  ): void {
    for (const [key, value] of map.entries()) {
      if (this.isShallowArrayMap(value)) {
        this.recurseMap(value, callback, [...parentKey, key]);
      } else {
        callback([...parentKey, key], value);
      }
    }
  }
}

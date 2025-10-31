import { ArrayUtils } from '../ArrayUtils';

export class ReadonlyMapUtils {
  static updateValue<K, V>(map: ReadonlyMap<K, V>, key: K, value: V): ReadonlyMap<K, V> {
    const newMap = new Map(map);
    return newMap.set(key, value);
  }

  static prependEntry<K, V>(map: ReadonlyMap<K, V>, key: K, value: V): ReadonlyMap<K, V> {
    const entries: [K, V][] = [...map];
    const updatedEntries = ArrayUtils.prepend<[K, V]>(entries, [key, value]);
    return new Map(updatedEntries);
  }

  static deleteEntry<K, V>(map: ReadonlyMap<K, V>, key: K): ReadonlyMap<K, V> {
    const newMap = new Map(map);
    newMap.delete(key);
    return newMap;
  }
}

import { LRUCache } from 'lru-cache';

/**
 * Used to cache a function's return value based on its arguments.
 * @param fn The function to cache.
 * @param options The LRUCache options.
 * @param keyFn A function to generate the cache key from the function's arguments. If the function returns null, the result will not be cached. If the function is not provided, the JSON.stringify function is used.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cachedFunction<T extends (...args: any[]) => any>(
  fn: T,
  options: LRUCache.Options<string, ReturnType<T>, unknown>,
  keyFn?: (...args: Parameters<T>) => string | null,
): T {
  const cache = new LRUCache<string, ReturnType<T>>(options);
  const keyFunction = keyFn ?? ((...args: Parameters<T>) => JSON.stringify(args));
  const cachedFunction = function (...args: Parameters<T>): ReturnType<T> {
    const key = keyFunction(...args);
    if (key != null) {
      const cachedItem = cache.get(key);
      if (cachedItem != null) {
        return cachedItem;
      }
    }
    const result = fn(...args);
    if (key != null) {
      cache.set(key, result);
    }
    return result;
  };
  return cachedFunction as T;
}

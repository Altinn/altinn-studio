const _cache = new Map();
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (_cache.has(key)) {
      return _cache.get(key);
    }

    const result = fn(...args);
    _cache.set(key, result);
    return result;
  } as T;
}

/**
 * Currently used to invalidate the cache in tests.
 */
export function invalidateCache() {
  _cache.clear();
}

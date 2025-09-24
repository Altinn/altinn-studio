import { useCallback, useRef } from 'react';

/**
 * This utility hook solves the following problem:
 * You need to map a list of objects to react components, which requires a unique key.
 * The objects themselves do not have any unique identifiers,
 * and most/all fields could potentially match in other objects.
 * Using JSON.stringify(object) for each object in each render turns out to be very slow.
 *
 * This hook takes an object reference, which should be unique in the list,
 * and assigns it a unique numeric id, scoped to the component where the hook is used.
 * The use of WeakMap ensures that if the object is no longer referenced anywhere besides here,
 * it can still be garbage collected.
 */
export function useGetUniqueKeyFromObject() {
  const counter = useRef(1);
  const keyMap = useRef(new WeakMap<WeakKey, number>());

  return useCallback((obj: object) => {
    let key = keyMap.current.get(obj);
    if (key) {
      return key;
    }

    key = counter.current++;
    keyMap.current.set(obj, key);
    return key;
  }, []);
}

import { useRef } from 'react';

/**
 * Similar to useShallow from zustand: https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow
 * only this works on objects directly instead of selectors.
 */
export function useShallowObjectMemo<T extends Object>(next: T): T {
  const prev = useRef<T>();
  return objectShallowEqual(next, prev.current) ? prev.current : (prev.current = next);
}

type Object = { [key: string]: unknown };

function objectShallowEqual<T extends Object>(next: T, prev?: T): prev is T {
  if (!prev) {
    return false;
  }
  for (const key in next) {
    if (next[key] !== prev[key]) {
      return false;
    }
  }
  return true;
}

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

/**
 * Assumes that both prev and next are objects with the exact same keys
 */
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

/**
 * Custom implementation of zustand's useShallow. This is slightly stricter about what types are allowed (only objects or arrays),
 * but avoids constructing Map's to compare entries so this should be cheaper.
 * See: https://github.com/pmndrs/zustand/blob/f540ca8294bbca568a97020e0f0acc7042820218/src/vanilla/shallow.ts
 */
export function useShallow<S, T extends ObjectOrArray>(selector: (state: S) => T): (state: S) => T {
  const prev = useRef<T>();
  return (state) => {
    const next = selector(state);
    return objectOrArrayShallowEqual(next, prev.current) ? prev.current : (prev.current = next);
  };
}

export type ObjectOrArray = { [key: string]: unknown } | unknown[];

function objectOrArrayShallowEqual<T extends ObjectOrArray>(next: T, prev?: T): prev is T {
  if (!prev) {
    return false;
  }
  if (next === prev) {
    return true;
  }

  const aIsArray = Array.isArray(next);
  const bIsArray = Array.isArray(prev);

  // Array case
  if (aIsArray && bIsArray) {
    if (next.length !== prev.length) {
      return false;
    }
    for (let i = 0; i < next.length; i++) {
      if (next[i] !== prev[i]) {
        return false;
      }
    }
    return true;
  }

  // Only one is an array
  if (aIsArray || bIsArray) {
    return false;
  }

  // Object case
  for (const key in next) {
    if (!(key in prev) || next[key] !== prev[key]) {
      return false;
    }
  }
  for (const key in prev) {
    if (!(key in next)) {
      return false;
    }
  }
  return true;
}

import { useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Returns a mutable ref object whose `.current` property is always set to the most recent value passed to `useAsRef`.
 * This is useful for keeping any mutable value (e.g. a function) up to date without causing a rerender.
 *
 * Say you have a value that you need to read when calling a function, but you don't want to rerender (and
 * re-create the function) every time the value changes. You can use `useAsRef` and read the value from the
 * `.current` property of the returned ref object instead.
 */
export function useAsRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

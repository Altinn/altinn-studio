import { useRef } from 'react';
import type { MutableRefObject } from 'react';

/**
 * Returns a mutable ref object whose `.current` property is always set to the most recent value passed to `useAsRef`.
 * This is useful for keeping any mutable value (e.g. a function) up to date without causing a rerender.
 *
 * Say you have a value that you need to read when calling a function, but you don't want to rerender (and
 * re-create the function) every time the value changes. You can use `useAsRef` and read the value from the
 * `.current` property of the returned ref object instead.
 */
export function useAsRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

type MutableRefMap<T> = {
  [K in keyof T]: MutableRefObject<T[K]>;
};

/**
 * In some cases you may have lots of different states that you want to keep track of, but you don't want to
 * apply useAsRef to them individually. In that case you can use this function to create a single object that
 * contains all the states as refs.
 *
 * Be aware that this hook will break the rule of hooks if you provide a new object with different keys on every
 * render. If you need to do that, you should use `useAsRef` on them individually instead.
 */
export function useAsRefObject<T extends Record<string, any>>(values: T): MutableRefMap<T> {
  const manyRefs: MutableRefMap<T> = {} as any;
  for (const key in values) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    manyRefs[key] = useAsRef(values[key]);
  }
  return manyRefs;
}

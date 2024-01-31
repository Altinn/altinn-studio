import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';

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

/**
 * Same as `useAsRefFromSelector`, but allows the store to be `ContextNotProvided`. In that case the ref will
 * always be set to `ContextNotProvided`.
 */
export function useAsRefFromLaxSelector<T, U>(
  store: StoreApi<T> | typeof ContextNotProvided,
  selector: (state: T) => U,
) {
  const ref = useRef<U | typeof ContextNotProvided>(
    store === ContextNotProvided ? ContextNotProvided : selector(store.getState()),
  );

  useEffect(
    () => {
      if (store === ContextNotProvided) {
        return;
      }
      return store.subscribe((state) => {
        ref.current = selector(state);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store],
  );
  return ref;
}

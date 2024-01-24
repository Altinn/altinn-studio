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
 * Special version of `useAsRef` that takes a Zustand store and a selector function. The ref will be updated
 * whenever the selected value changes, without re-rendering the component/hook that uses it.
 *
 * @see https://github.com/pmndrs/zustand#transient-updates-for-often-occurring-state-changes
 */
export function useAsRefFromSelector<T, U>(store: StoreApi<T>, selector: (state: T) => U) {
  const ref = useRef<U>(selector(store.getState()));

  useEffect(
    () =>
      store.subscribe((state) => {
        ref.current = selector(state);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
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

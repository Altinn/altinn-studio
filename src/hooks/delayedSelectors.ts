import { useCallback, useEffect, useRef, useState } from 'react';

import deepEqual from 'fast-deep-equal';
import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import { ShallowArrayMap } from 'src/core/structures/ShallowArrayMap';

type Selector<T, U> = (state: T) => U;
type SelectorMap<C extends DSConfig> = ShallowArrayMap<{
  fullSelector: Selector<TypeFromConf<C>, unknown>;
  value: unknown;
}>;

type TypeFromConf<C extends DSConfig> = C extends DSConfig<infer T> ? T : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModeFromConf<C extends DSConfig> = C extends DSConfig<any, infer M> ? M : never;

/**
 * A complex hook that returns a function you can use to select a value at some point in the future. If you never
 * select any values from the store, the store will not be subscribed to, and the component will not re-render when
 * the store changes. If you do select a value, the store will be subscribed to, and the component will only re-render
 * if the selected value(s) change when compared with the previous value.
 *
 * An important note when using this hook: The selector functions you pass must also be memoized (i.e. created with
 * useMemo or useCallback), or the component will fall back to re-rendering every time the store changes. This is
 * because the function itself will be recreated every time the component re-renders, and the function
 * will not be able to be used as a cache key.
 */
export function useDelayedSelector<C extends DSConfig>({
  store,
  deps = [],
  strictness,
  mode,
  makeCacheKey = mode.mode === 'simple' ? defaultMakeCacheKey : defaultMakeCacheKeyForInnerSelector,
  equalityFn = deepEqual,
  onlyReRenderWhen,
}: DSProps<C>): DSReturn<C> {
  const selectorsCalled = useRef<SelectorMap<C>>(new ShallowArrayMap());
  const [renderCount, forceRerender] = useState(0);
  const lastReRenderValue = useRef<unknown>(undefined);

  useEffect(
    () => {
      if (store === ContextNotProvided) {
        return;
      }

      return store.subscribe((state) => {
        let stateChanged = true;
        if (onlyReRenderWhen) {
          stateChanged = onlyReRenderWhen(state, lastReRenderValue.current, (v) => {
            lastReRenderValue.current = v;
          });
        }
        if (!stateChanged) {
          return;
        }

        // When the state changes, we run all the known selectors again to figure out if anything changed. If it
        // did change, we'll clear the list of selectors to force a re-render.
        const selectors = selectorsCalled.current.values();
        let changed = false;
        for (const { fullSelector, value } of selectors) {
          if (!equalityFn(value, fullSelector(state))) {
            changed = true;
            break;
          }
        }
        if (changed) {
          selectorsCalled.current = new ShallowArrayMap();
          forceRerender((prev) => prev + 1);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store],
  );

  return useCallback(
    (...args: unknown[]) => {
      if (store === ContextNotProvided) {
        if (strictness === SelectorStrictness.throwWhenNotProvided) {
          throw new Error('useDelayedSelector: store not provided');
        }
        return ContextNotProvided;
      }

      if (isNaN(renderCount)) {
        // This should not happen, and this piece of code looks a bit out of place. This really is only here
        // to make sure the callback is re-created and the component re-renders when the store changes.
        throw new Error('useDelayedSelector: renderCount is NaN');
      }

      const cacheKey = makeCacheKey(args);
      const prev = selectorsCalled.current.get(cacheKey);
      if (prev) {
        // Performance-wise we could also just have called the selector here, it doesn't really matter. What is
        // important however, is that we let developers know as early as possible if they forgot to include a dependency
        // or otherwise used the hook incorrectly, so we'll make sure to return the value to them here even if it
        // could be stale (but only when improperly used).
        return prev.value;
      }

      const state = store.getState();

      if (mode.mode === 'simple') {
        const { selector } = mode as SimpleArgMode;
        const fullSelector: Selector<TypeFromConf<C>, unknown> = (state) => selector(...args)(state);
        const value = fullSelector(state);
        selectorsCalled.current.set(cacheKey, { fullSelector, value });
        return value;
      }

      if (mode.mode === 'innerSelector') {
        const { makeArgs } = mode as InnerSelectorMode;
        if (typeof args[0] !== 'function' || !Array.isArray(args[1]) || args.length !== 2) {
          throw new Error('useDelayedSelector: innerSelector must be a function');
        }
        const fullSelector: Selector<TypeFromConf<C>, unknown> = (state) => {
          const innerArgs = makeArgs(state);
          const innerSelector = args[0] as (...args: typeof innerArgs) => unknown;
          return innerSelector(...innerArgs);
        };

        const value = fullSelector(state);
        selectorsCalled.current.set(cacheKey, { fullSelector, value });
        return value;
      }

      throw new Error('useDelayedSelector: invalid mode');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, renderCount, ...deps],
  ) as DSReturn<C>;
}

function defaultMakeCacheKeyForInnerSelector(args: unknown[]): unknown[] {
  if (args.length === 2 && typeof args[0] === 'function' && Array.isArray(args[1])) {
    return [args[0].toString().trim(), ...args[1]];
  }

  throw new Error('defaultMakeCacheKeyForInnerSelector: invalid arguments, use simple mode instead');
}

function defaultMakeCacheKey(args: unknown[]): unknown[] {
  // Make sure we don't allow inner selectors here, they need to use another mode:
  if (args.length === 2 && typeof args[0] === 'function' && Array.isArray(args[1])) {
    throw new Error('defaultMakeCacheKey: inner selectors are not allowed, use innerSelector mode instead');
  }

  return args;
}

export enum SelectorStrictness {
  throwWhenNotProvided = 'throwWhenNotProvided',
  returnWhenNotProvided = 'returnWhenNotProvided',
}

export type OnlyReRenderWhen<Type, Internal> = (
  state: Type,
  lastValue: Internal | undefined,
  setNewValue: (v: Internal) => void,
) => boolean;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SimpleArgMode<T = unknown, Args extends any[] = unknown[], RetVal = unknown> {
  mode: 'simple';
  selector: (...args: Args) => (state: T) => RetVal;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface InnerSelectorMode<T = unknown, Args extends any[] = unknown[]> {
  mode: 'innerSelector';
  makeArgs: (state: T) => Args;
}

export type DSMode<T> = SimpleArgMode<T> | InnerSelectorMode<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DSConfig<Type = any, Mode extends DSMode<Type> = any, Strictness extends SelectorStrictness = any> {
  store: StoreApi<Type> | typeof ContextNotProvided;
  mode: Mode;
  strictness: Strictness;
}

export interface DSProps<C extends DSConfig> {
  // A delayed selector must work with a Zustand store, or with ContextNotProvided if the store is not provided.
  store: C['store'];

  // Strictness changes how the delayed selector will work when ContextNotProvided is passed as the store.
  strictness: C['strictness'];

  // State selected from the delayed selector will be compared with this function. The default is deepEqual, meaning
  // that the state will be compared by value, not by reference.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  equalityFn?: (a: any, b: any) => boolean;

  // A function that will create a cache key for the delayed selector. This is used to cache the results of the
  // selector functions. Every argument to the selector function will be passed to this function.
  makeCacheKey?: (args: unknown[]) => unknown[];

  // Optionally, you can pass a function that will determine if the selector functions should re-run. If this function
  // returns false, an update to the store will not cause a re-render of the component.
  onlyReRenderWhen?: OnlyReRenderWhen<TypeFromConf<C>, unknown>;

  mode: C['mode'];

  // Any dependencies that should be passed to the delayed selector. This is used to determine when the entire
  // selector should be re-created.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps?: any[];
}

export type DSReturn<C extends DSConfig> =
  ModeFromConf<C> extends SimpleArgMode
    ? (...args: Parameters<C['mode']['selector']>) => ReturnType<ReturnType<C['mode']['selector']>>
    : <U>(
        innerSelector: (...args: ReturnType<C['mode']['makeArgs']>) => U,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deps: any[],
      ) => C['strictness'] extends SelectorStrictness.returnWhenNotProvided ? U | typeof ContextNotProvided : U;

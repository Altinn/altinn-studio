import { useCallback } from 'react';

interface Props<T> {
  cacheKey: (string | number)[] | string | number;
  currentState: T;
}

type Callback<T, RetVal> = (state: T, setReturnValue: (val: RetVal) => void) => boolean;
type WaitForState<T, RetVal> = (callback: Callback<T, RetVal>) => Promise<RetVal>;
type Subscriber = (state: any) => boolean;

interface CacheEntry {
  subscribers: (Subscriber | undefined)[];
  state: any;
}

const currentStateCache: Record<string, CacheEntry> = {};

/**
 * This hook gives you an async function that you can use to wait for a specific state to be set.
 * Be sure to set a unique cacheKey for each state you want to wait for.
 */
export function useWaitForState<RetVal, T>({ cacheKey, currentState }: Props<T>): WaitForState<T, RetVal> {
  const cacheKeyString = Array.isArray(cacheKey) ? cacheKey.join('|') : cacheKey;
  const cache = currentStateCache[cacheKeyString];
  if (cache) {
    cache.state = currentState;
    for (let i = 0; i < cache.subscribers.length; i++) {
      const subscriber = cache.subscribers[i];
      if (subscriber && subscriber(currentState)) {
        cache.subscribers[i] = undefined;
      }
    }
  } else {
    currentStateCache[cacheKeyString] = {
      subscribers: [],
      state: currentState,
    };
  }

  return useCallback(
    (callback) =>
      new Promise((resolve) => {
        const cache = currentStateCache[cacheKeyString];
        cache.subscribers.push((state) => {
          let returnValue: RetVal | undefined = undefined;
          function setReturnValue(val: RetVal) {
            returnValue = val;
          }
          if (callback(state, setReturnValue)) {
            resolve(returnValue as RetVal);
            return true;
          }
          return false;
        });
      }),
    [cacheKeyString],
  );
}

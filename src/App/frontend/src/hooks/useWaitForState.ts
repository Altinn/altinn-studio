import { useCallback } from 'react';

import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';

export type WaitForState<T, RetVal> = (callback: Callback<T, RetVal>) => Promise<RetVal>;
type Callback<T, RetVal> = (state: T, setReturnValue: (val: RetVal) => void) => boolean;
type StoreInput<T> = T extends typeof ContextNotProvided ? StoreApi<T> | typeof ContextNotProvided : StoreApi<T>;

/**
 * This hook gives you an async function that you can use to wait for a specific state to be set.
 * Pass a zustand store and the returned function will check the current state and subscribe if needed.
 */
export function useWaitForState<RetVal, T>(store: StoreInput<T>): WaitForState<T, RetVal> {
  return useCallback(
    async (callback) => {
      let returnValue: RetVal | undefined = undefined;

      const setReturnValue = (val: RetVal) => {
        returnValue = val;
      };

      // Handle ContextNotProvided - can never resolve since there's no store to subscribe to
      if (store === ContextNotProvided) {
        return new Promise<RetVal>(() => {});
      }

      // Check current state immediately
      const currentState = store.getState();
      const immediateResult = callback(currentState, setReturnValue);
      if (immediateResult) {
        return returnValue as RetVal;
      }

      // Current state doesn't match - subscribe and wait
      return new Promise<RetVal>((resolve) => {
        const unsubscribe = store.subscribe(async (newState) => {
          const shouldResolve = callback(newState, setReturnValue);
          if (shouldResolve) {
            unsubscribe();
            resolve(returnValue as RetVal);
          }
        });
      });
    },
    [store],
  );
}

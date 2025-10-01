import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';

export type WaitForState<T, RetVal> = (callback: Callback<T, RetVal>) => Promise<RetVal>;
type Callback<T, RetVal> = (state: T, setReturnValue: (val: RetVal) => void) => boolean | Promise<boolean>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Subscriber = (state: any) => boolean | Promise<boolean>;

// If ContextNotProvided is a valid state, it will possibly be provided as a direct
// input (not wrapped in a ref or store)
type ValidInputs<T> = T extends typeof ContextNotProvided
  ? [RefObject<T> | StoreApi<T> | typeof ContextNotProvided]
  : [RefObject<T> | StoreApi<T>];

/**
 * This hook gives you an async function that you can use to wait for a specific state to be set.
 * It is possible to either pass a ref to the state, you want to wait for (which requires your component itself
 * to make this hook re-render when state changes), or you can pass a zustand store.
 */
export function useWaitForState<RetVal, T>(state: ValidInputs<T>[0]): WaitForState<T, RetVal> {
  const subscribersRef = useRef<Set<Subscriber>>(new Set());
  // Call subscribers on every re-render/state change if state is a ref
  if (isRef(state)) {
    for (const subscriber of subscribersRef.current) {
      const result = subscriber(state.current);
      if (result === true) {
        subscribersRef.current.delete(subscriber);
      } else if (result instanceof Promise) {
        result.then((res) => {
          res && subscribersRef.current.delete(subscriber);
        });
      }
    }
  }

  useEffect(() => {
    // Call subscribers on every state change if state is a zustand store
    if (isStore(state)) {
      return state.subscribe(async (state) => {
        for (const subscriber of subscribersRef.current) {
          if (await subscriber(state)) {
            subscribersRef.current.delete(subscriber);
          }
        }
      });
    }
  }, [state]);

  return useCallback(
    async (callback) => {
      let returnValue: RetVal | undefined = undefined;

      const setReturnValue = (val: RetVal) => {
        returnValue = val;
      };

      // Handle ContextNotProvided case - wait for subscription only
      if (state === ContextNotProvided) {
        return new Promise<RetVal>((resolve) => {
          subscribersRef.current.add(async (state: T) => {
            const shouldResolve = await callback(state, setReturnValue);
            if (shouldResolve) {
              resolve(returnValue as RetVal);
              return true;
            }
            return false;
          });
        });
      }

      // Get current state and test it immediately
      const currentState = isRef(state) ? state.current : state.getState();
      const immediateResult = callback(currentState, setReturnValue);

      // Handle synchronous result
      if (immediateResult === true) {
        return returnValue as RetVal;
      }

      // Handle async result
      if (immediateResult instanceof Promise) {
        const resolved = await immediateResult;
        if (resolved) {
          return returnValue as RetVal;
        }
        // If async check failed, fall through to wait for subscription
      }

      // Current state doesn't match - wait for subscription
      return new Promise<RetVal>((resolve) => {
        subscribersRef.current.add(async (state: T) => {
          const shouldResolve = await callback(state, setReturnValue);
          if (shouldResolve) {
            resolve(returnValue as RetVal);
            return true;
          }
          return false;
        });
      });
    },
    [state],
  );
}

function isRef<T>(state: RefObject<T> | StoreApi<T> | typeof ContextNotProvided): state is RefObject<T> {
  return state !== ContextNotProvided && 'current' in state && !('subscribe' in state);
}

function isStore<T>(state: RefObject<T> | StoreApi<T> | typeof ContextNotProvided): state is StoreApi<T> {
  return state !== ContextNotProvided && 'subscribe' in state && !('current' in state);
}

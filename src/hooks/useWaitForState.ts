import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

import type { StoreApi } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';

export type WaitForState<T, RetVal> = (callback: Callback<T, RetVal>) => Promise<RetVal>;
type Callback<T, RetVal> = (state: T, setReturnValue: (val: RetVal) => void) => boolean;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Subscriber = (state: any) => boolean;

// If ContextNotProvided is a valid state, it will possibly be provided as a direct
// input (not wrapped in a ref or store)
type ValidInputs<T> = T extends typeof ContextNotProvided
  ? [MutableRefObject<T> | StoreApi<T> | typeof ContextNotProvided]
  : [MutableRefObject<T> | StoreApi<T>];

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
      if (subscriber(state.current)) {
        subscribersRef.current.delete(subscriber);
      }
    }
  }

  useEffect(() => {
    // Call subscribers on every state change if state is a zustand store
    if (isStore(state)) {
      return state.subscribe((state) => {
        for (const subscriber of subscribersRef.current) {
          if (subscriber(state)) {
            subscribersRef.current.delete(subscriber);
          }
        }
      });
    }
  }, [state]);

  return useCallback(
    (callback) =>
      new Promise((resolve) => {
        let returnValue: RetVal | undefined = undefined;

        function setReturnValue(val: RetVal) {
          returnValue = val;
        }

        if (state === ContextNotProvided) {
          subscribersRef.current.add((state) => {
            if (callback(state, setReturnValue)) {
              resolve(returnValue as RetVal);
              return true;
            }
            return false;
          });
          return;
        }

        const currentState = isRef(state) ? state.current : state.getState();

        // If state is already correct, resolve immediately
        if (callback(currentState, setReturnValue)) {
          resolve(returnValue as RetVal);
          return;
        }

        subscribersRef.current.add((state) => {
          if (callback(state, setReturnValue)) {
            resolve(returnValue as RetVal);
            return true;
          }
          return false;
        });
      }),
    [state],
  );
}

function isRef<T>(state: MutableRefObject<T> | StoreApi<T> | typeof ContextNotProvided): state is MutableRefObject<T> {
  return state !== ContextNotProvided && 'current' in state && !('subscribe' in state);
}

function isStore<T>(state: MutableRefObject<T> | StoreApi<T> | typeof ContextNotProvided): state is StoreApi<T> {
  return state !== ContextNotProvided && 'subscribe' in state && !('current' in state);
}

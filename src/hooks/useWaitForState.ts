import { useCallback, useRef } from 'react';

import { useAsRef } from 'src/hooks/useAsRef';

type Callback<T, RetVal> = (state: T, setReturnValue: (val: RetVal) => void) => boolean;
type WaitForState<T, RetVal> = (callback: Callback<T, RetVal>) => Promise<RetVal>;
type Subscriber = (state: any) => boolean;

/**
 * This hook gives you an async function that you can use to wait for a specific state to be set.
 */
export function useWaitForState<RetVal, T>(currentState: T): WaitForState<T, RetVal> {
  const subscribersRef = useRef<Subscriber[]>([]);
  const currentStateRef = useAsRef(currentState);

  // Call subscribers on every re-render/state change
  for (const idx in subscribersRef.current) {
    const subscriber = subscribersRef.current[idx];
    if (subscriber(currentState)) {
      subscribersRef.current.splice(Number(idx), 1);
    }
  }

  return useCallback(
    (callback) =>
      new Promise((resolve) => {
        let returnValue: RetVal | undefined = undefined;
        function setReturnValue(val: RetVal) {
          returnValue = val;
        }

        // If state is already correct, resolve immediately
        if (callback(currentStateRef.current, setReturnValue)) {
          resolve(returnValue as RetVal);
          return;
        }

        subscribersRef.current.push((state) => {
          if (callback(state, setReturnValue)) {
            resolve(returnValue as RetVal);
            return true;
          }
          return false;
        });
      }),
    [currentStateRef],
  );
}

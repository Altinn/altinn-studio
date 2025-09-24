import { useCallback, useMemo, useRef, useState } from 'react';
import type { DependencyList } from 'react';

import deepEqual from 'fast-deep-equal';

export function useStateDeepEqual<T>(initialValue: T) {
  const [state, setState] = useState(initialValue);
  const stateRef = useRef(initialValue);
  const updateState = useCallback(
    (next: T | ((prevState: T) => T)) => {
      const prevState = stateRef.current;
      const newState = typeof next === 'function' ? (next as (prevState: T) => T)(prevState) : next;
      if (!deepEqual(prevState, newState)) {
        stateRef.current = newState;
        setState(newState);
      }
    },
    [stateRef],
  );

  return [state, updateState] as const;
}

const customUndefined = Symbol('customUndefined');
type CustomUndefined = typeof customUndefined;

export function useMemoDeepEqual<T>(produceValue: () => T, deps: DependencyList): T {
  const lastState = useRef<T | CustomUndefined>(customUndefined);
  return useMemo(() => {
    const newState = produceValue();
    if (lastState.current === customUndefined || !deepEqual(lastState.current, newState)) {
      lastState.current = newState;
    }
    return lastState.current;

    // Make sure you don't put produceValue in the deps array, as it will cause the memo to always recompute
    // when given a new function reference.
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);
}
